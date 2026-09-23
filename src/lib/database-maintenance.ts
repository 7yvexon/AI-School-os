import type { PrismaClient } from "@prisma/client";

/** Bounded cleanup of expired operational records. Student work is never pruned. */
export async function cleanupExpiredRecords(
  db: PrismaClient,
  now = new Date(),
  batchSize = 1000,
) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000)
    throw new RangeError("Cleanup batch size must be between 1 and 1000.");
  if (!(now instanceof Date) || !Number.isFinite(now.getTime()))
    throw new RangeError("Invalid cleanup time.");

  // Index-backed batches limit lock duration. Concurrent maintenance workers skip
  // rows already being cleaned instead of competing for the same locks.
  const [sessions, rateLimits, uploadReservations] = await db.$transaction([
    db.$executeRaw`
      WITH expired AS (
        SELECT "id" FROM "Session"
        WHERE "expiresAt" <= ${now}
        ORDER BY "expiresAt", "id"
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "Session"
      USING expired
      WHERE "Session"."id" = expired."id"`,
    db.$executeRaw`
      WITH expired AS (
        SELECT "key" FROM "RateLimit"
        WHERE "expiresAt" <= ${now}
        ORDER BY "expiresAt", "key"
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "RateLimit"
      USING expired
      WHERE "RateLimit"."key" = expired."key"`,
    db.$executeRaw`
      WITH expired AS (
        SELECT "id" FROM "AttachmentUploadReservation"
        WHERE "expiresAt" <= ${now}
        ORDER BY "expiresAt", "id"
        LIMIT ${batchSize}
        FOR UPDATE SKIP LOCKED
      )
      DELETE FROM "AttachmentUploadReservation"
      USING expired
      WHERE "AttachmentUploadReservation"."id" = expired."id"`,
  ]);
  return { sessions, rateLimits, uploadReservations };
}
