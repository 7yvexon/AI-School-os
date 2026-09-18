CREATE TYPE "AttachmentScanStatus" AS ENUM ('QUARANTINED', 'CLEAN', 'INFECTED', 'SCAN_ERROR');

ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User"
SET "emailVerifiedAt" = "createdAt"
WHERE "emailVerifiedAt" IS NULL;

CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PendingRegistration_email_key"
  ON "PendingRegistration"("email");

CREATE UNIQUE INDEX "PendingRegistration_tokenHash_key"
  ON "PendingRegistration"("tokenHash");

CREATE INDEX "PendingRegistration_tokenExpiresAt_idx"
  ON "PendingRegistration"("tokenExpiresAt");

ALTER TABLE "Attachment"
  ADD COLUMN "scanStatus" "AttachmentScanStatus" NOT NULL DEFAULT 'QUARANTINED',
  ADD COLUMN "scannedAt" TIMESTAMP(3),
  ADD COLUMN "scanEngine" TEXT;
