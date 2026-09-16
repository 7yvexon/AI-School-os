import type { PrismaClient } from "@prisma/client";

/** Bounded cleanup of expired operational records. Student work is never pruned. */
export async function cleanupExpiredRecords(
  db: PrismaClient,
  now = new Date(),
  batchSize = 1000,
) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000)
    throw new RangeError("Cleanup batch size must be between 1 and 1000.");
  if (!Number.isFinite(now.getTime())) throw new RangeError("Invalid cleanup time.");

  // Index-backed batches limit lock duration. Concurrent maintenance workers skip
  // rows already being cleaned instead of competing for the same locks.
  const [sessions, rateLimits] = await db.$transaction([
    db.$executeRaw`
      DELETE FROM "Session" WHERE "id" IN (
        SELECT "id" FROM "Session" WHERE "expiresAt" <= ${now}
        ORDER BY "expiresAt" LIMIT ${batchSize} FOR UPDATE SKIP LOCKED
      )`,
    db.$executeRaw`
      DELETE FROM "RateLimit" WHERE "key" IN (
        SELECT "key" FROM "RateLimit" WHERE "expiresAt" <= ${now}
        ORDER BY "expiresAt" LIMIT ${batchSize} FOR UPDATE SKIP LOCKED
      )`,
  ]);
  return { sessions, rateLimits };
}
