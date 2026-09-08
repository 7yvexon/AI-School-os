import { db } from "./db";
export async function rateLimit(key: string, limit: number, windowMs: number) {
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
    throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
}
