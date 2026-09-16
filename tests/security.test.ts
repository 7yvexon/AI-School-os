import { test } from "node:test";
import assert from "node:assert/strict";
import { requestIp } from "../src/lib/request";
import { createClassCode } from "../src/lib/class-code";
import { attachmentMimeMatchesData } from "../src/lib/attachment";
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
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ),
    true,
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
    attachmentMimeMatchesData("text/plain", new Uint8Array([65, 0, 66])),
    false,
  );
  assert.equal(
    attachmentMimeMatchesData("text/plain", new TextEncoder().encode("내용")),
    true,
  );
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
});
