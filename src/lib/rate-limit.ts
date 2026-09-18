import "server-only";
import { db } from "./db";
import { validateRateLimitConfig } from "./rate-limit-core";

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  const config = validateRateLimitConfig(key, limit, windowMs);
  const record = await db.rateLimit.upsert({
    where: { key: `${config.key}:${config.bucket}` },
    create: {
      key: `${config.key}:${config.bucket}`,
      expiresAt: new Date(config.expiresAtMs),
    },
    update: { count: { increment: 1 } },
  });
  if (record.count > limit)
    throw new RateLimitError(
      Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000)),
    );
}
