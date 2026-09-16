import "server-only";
import { db } from "./db";

export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (
    !key ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(windowMs) ||
    windowMs < 1000
  )
    throw new RangeError("Invalid rate limit configuration.");
  const bucket = Math.floor(Date.now() / windowMs);
  const record = await db.rateLimit.upsert({
    where: { key: `${key}:${bucket}` },
    create: {
      key: `${key}:${bucket}`,
      expiresAt: new Date((bucket + 1) * windowMs),
    },
    update: { count: { increment: 1 } },
  });
  if (record.count > limit)
    throw new RateLimitError(
      Math.max(1, Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000)),
    );
}
