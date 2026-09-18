export type RateLimitConfig = {
  key: string;
  bucket: number;
  expiresAtMs: number;
};

export function validateRateLimitConfig(
  key: unknown,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitConfig {
  if (
    typeof key !== "string" ||
    !key.trim() ||
    key.length > 512 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 2_147_483_647 ||
    !Number.isSafeInteger(windowMs) ||
    windowMs < 1000 ||
    !Number.isSafeInteger(now) ||
    now < 0
  )
    throw new RangeError("Invalid rate limit configuration.");
  const normalizedKey = key.trim();
  const bucket = Math.floor(now / windowMs);
  const expiresAtMs = (bucket + 1) * windowMs;
  if (
    !Number.isSafeInteger(bucket) ||
    !Number.isSafeInteger(expiresAtMs) ||
    expiresAtMs > 8_640_000_000_000_000
  )
    throw new RangeError("Invalid rate limit configuration.");
  return { key: normalizedKey, bucket, expiresAtMs };
}
