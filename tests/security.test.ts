import { test } from "node:test";
import assert from "node:assert/strict";
import { requestIp } from "../src/lib/request";
import { createClassCode } from "../src/lib/class-code";
import {
  attachmentContentDisposition,
  attachmentDataSizeAllowed,
  attachmentMimeMatchesData,
  sanitizeAttachmentName,
} from "../src/lib/attachment";
import { MAX_ATTACHMENT_BYTES } from "../src/lib/limits";
import { parseRuntimeConfig, RuntimeConfigError } from "../src/lib/env-core";

test("request IP uses forwarded headers only when the proxy is trusted", () => {
  const previous = process.env.TRUST_PROXY;
  try {
    process.env.TRUST_PROXY = "false";
    assert.equal(
      requestIp(new Headers({ "x-forwarded-for": "198.51.100.10" })),
      "direct",
    );
    process.env.TRUST_PROXY = "true";
    assert.equal(
      requestIp(
        new Headers({
          "x-forwarded-for": "198.51.100.10, 203.0.113.20",
        }),
      ),
      "198.51.100.10",
    );
    assert.equal(
      requestIp(new Headers({ "x-real-ip": "203.0.113.20" })),
      "203.0.113.20",
    );
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  }
});

test("class invite codes keep the expected prefix and entropy", () => {
  const code = createClassCode();
  assert.match(code, /^BSS-[0-9A-F]{10}$/);
});

test("attachment MIME checks require matching signatures", () => {
  assert.equal(
    attachmentMimeMatchesData(
      "application/pdf",
      new TextEncoder().encode("%PDF-1.7"),
    ),
    true,
  );
  assert.equal(
    attachmentMimeMatchesData(
      "image/png",
      new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
        1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 0, 0, 0, 0, 0,
      ]),
    ),
    true,
  );
  assert.equal(
    attachmentMimeMatchesData(
      "image/png",
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData(
      "image/jpeg",
      new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 1,
        0x11, 0,
      ]),
    ),
    true,
  );
  assert.equal(
    attachmentMimeMatchesData("image/jpeg", new Uint8Array([0xff, 0xd8, 0xff])),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData(
      "image/png",
      new TextEncoder().encode("not an image"),
    ),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData(
      "application/pdf",
      new TextEncoder().encode("not a pdf %PDF-1.7"),
    ),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData(
      "application/pdf",
      new TextEncoder().encode("%PDF-"),
    ),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData("text/plain", new Uint8Array([65, 0, 66])),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData("text/plain", new Uint8Array([65, 1, 66])),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData("text/plain", new TextEncoder().encode("내용")),
    true,
  );
  assert.equal(
    attachmentMimeMatchesData("text/plain", new Uint8Array()),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData("text/plain", new Uint8Array([0xfe, 0xff, 0x00])),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData("text/plain", new Uint8Array([0xef, 0xbb, 0xbf])),
    false,
  );
  assert.equal(attachmentDataSizeAllowed(new Uint8Array([1])), true);
  assert.equal(
    attachmentDataSizeAllowed(new Uint8Array(MAX_ATTACHMENT_BYTES)),
    true,
  );
  assert.equal(
    attachmentDataSizeAllowed(new Uint8Array(MAX_ATTACHMENT_BYTES + 1)),
    false,
  );
  assert.equal(sanitizeAttachmentName("../notes.txt"), ".._notes.txt");
  assert.equal(sanitizeAttachmentName("\u0000\r\n"), "___");
  assert.equal(sanitizeAttachmentName("."), null);
  assert.equal(sanitizeAttachmentName(null), null);
  const disposition = attachmentContentDisposition("보고서 '최종'.txt");
  assert.match(disposition, /^attachment; filename="/);
  assert.match(disposition, /; filename\*=UTF-8''/);
  assert.equal(/[\r\n]/.test(disposition), false);
});

test("runtime configuration validates production requirements without exposing values", () => {
  const source = {
    DATABASE_URL: "postgresql://school:password@localhost:5432/school_os",
    AUTH_SECRET: "a".repeat(32),
    APP_URL: "https://school.example",
    TRUST_PROXY: "true",
    NODE_ENV: "production",
  };
  const config = parseRuntimeConfig(source, true);
  assert.equal(config.appUrl, source.APP_URL);
  assert.equal(config.trustProxy, true);
  assert.throws(
    () => parseRuntimeConfig({ ...source, AUTH_SECRET: "short" }, true),
    RuntimeConfigError,
  );
  assert.throws(
    () =>
      parseRuntimeConfig({ ...source, APP_URL: "http://school.example" }, true),
    RuntimeConfigError,
  );
  assert.throws(
    () =>
      parseRuntimeConfig(
        { ...source, SERVER_ACTION_ALLOWED_ORIGINS: "https://proxy.example" },
        true,
      ),
    RuntimeConfigError,
  );
  assert.throws(
    () => parseRuntimeConfig({ ...source, NODE_ENV: "staging" }, true),
    RuntimeConfigError,
  );
});
