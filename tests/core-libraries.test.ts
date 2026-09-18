import { test } from "node:test";
import assert from "node:assert/strict";
import { dayKey, daysLeft } from "../src/lib/domain";
import { validateRateLimitConfig } from "../src/lib/rate-limit-core";
import { requestIp } from "../src/lib/request";
import { cleanupExpiredRecords } from "../src/lib/database-maintenance";
import { parseRuntimeConfig } from "../src/lib/env-core";

test("날짜 경계 함수는 유효하지 않은 날짜를 거부한다", () => {
  assert.throws(() => dayKey(new Date(Number.NaN)), RangeError);
  assert.throws(() => daysLeft("not-a-date"), RangeError);
});

test("신뢰 프록시 IP는 유효한 IP 주소만 사용한다", () => {
  const previous = process.env.TRUST_PROXY;
  try {
    process.env.TRUST_PROXY = " true ";
    assert.equal(
      requestIp(
        new Headers({
          "x-forwarded-for": "not-an-ip",
          "x-real-ip": "2001:db8::1",
        }),
      ),
      "2001:db8::1",
    );
    assert.equal(
      requestIp(new Headers({ "x-forwarded-for": "not-an-ip" })),
      "direct",
    );
  } finally {
    if (previous === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previous;
  }
});

test("운영 환경 설정은 원본 URL과 비밀값 경계를 검증한다", () => {
  const source = {
    DATABASE_URL: "postgresql://school:password@localhost:5432/school_os",
    AUTH_SECRET: "a".repeat(32),
    APP_URL: "https://school.example",
    TRUST_PROXY: "true",
    SERVER_ACTION_ALLOWED_ORIGINS: "*.school.example,school.example:8443",
    NODE_ENV: "production",
  };
  assert.deepEqual(
    parseRuntimeConfig(source, true).serverActionAllowedOrigins,
    ["*.school.example", "school.example:8443"],
  );
  for (const APP_URL of [
    "https://school.example/path",
    "https://school.example?next=/login",
    "https://user:password@school.example",
  ])
    assert.throws(() => parseRuntimeConfig({ ...source, APP_URL }, true));
  assert.throws(() =>
    parseRuntimeConfig({ ...source, AUTH_SECRET: ` ${"a".repeat(31)} ` }, true),
  );
  assert.throws(() =>
    parseRuntimeConfig({ ...source, SERVER_ACTION_ALLOWED_ORIGINS: "*" }, true),
  );
  assert.throws(() =>
    parseRuntimeConfig({ ...source, TRUST_PROXY: 1 as never }, true),
  );
  assert.throws(() => parseRuntimeConfig(null as never, true));
});

test("요청 제한 설정은 안전한 정수 범위와 키를 요구한다", () => {
  assert.throws(() => validateRateLimitConfig(" ", 1, 1000), RangeError);
  assert.throws(() => validateRateLimitConfig("key", 0, 1000), RangeError);
  assert.throws(() => validateRateLimitConfig("key", 1, 999), RangeError);
  assert.throws(
    () => validateRateLimitConfig("key", Number.MAX_SAFE_INTEGER, 1000),
    RangeError,
  );
  assert.throws(
    () => validateRateLimitConfig("key", 1, Number.MAX_SAFE_INTEGER),
    RangeError,
  );
  assert.deepEqual(validateRateLimitConfig(" key ", 1, 1000, 2500), {
    key: "key",
    bucket: 2,
    expiresAtMs: 3000,
  });
});

test("만료 데이터 정리는 유한한 시각과 제한된 배치만 허용한다", async () => {
  const db = undefined as never;
  await assert.rejects(
    () => cleanupExpiredRecords(db, new Date(Number.NaN)),
    RangeError,
  );
  await assert.rejects(
    () => cleanupExpiredRecords(db, new Date(), 0),
    RangeError,
  );
  await assert.rejects(
    () => cleanupExpiredRecords(db, new Date(), 1001),
    RangeError,
  );
});
