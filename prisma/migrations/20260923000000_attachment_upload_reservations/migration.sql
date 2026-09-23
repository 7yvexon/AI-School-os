CREATE TABLE "AttachmentUploadReservation" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttachmentUploadReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AttachmentUploadReservation_size_range" CHECK ("size" BETWEEN 1 AND 5242880)
);

CREATE INDEX "AttachmentUploadReservation_classId_expiresAt_idx"
  ON "AttachmentUploadReservation"("classId", "expiresAt");
CREATE INDEX "AttachmentUploadReservation_teacherId_expiresAt_idx"
  ON "AttachmentUploadReservation"("teacherId", "expiresAt");
CREATE INDEX "AttachmentUploadReservation_expiresAt_idx"
  ON "AttachmentUploadReservation"("expiresAt");

ALTER TABLE "AttachmentUploadReservation"
  ADD CONSTRAINT "AttachmentUploadReservation_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "Class"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "AttachmentUploadReservation_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
