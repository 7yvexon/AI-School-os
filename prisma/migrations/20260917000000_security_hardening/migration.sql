ALTER TABLE "User"
  ADD COLUMN "teacherApprovedAt" TIMESTAMP(3),
  ADD COLUMN "aiConsentAt" TIMESTAMP(3);

ALTER TABLE "Assignment"
  ADD COLUMN "archivedAt" TIMESTAMP(3);

DROP INDEX IF EXISTS "Assignment_classId_dueAt_idx";
CREATE INDEX "Assignment_classId_archivedAt_dueAt_idx"
  ON "Assignment"("classId", "archivedAt", "dueAt");

CREATE TABLE "SubmissionReview" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL,
    "feedback" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubmissionReview_submissionId_createdAt_idx"
  ON "SubmissionReview"("submissionId", "createdAt");

CREATE INDEX "SubmissionReview_reviewerId_createdAt_idx"
  ON "SubmissionReview"("reviewerId", "createdAt");

ALTER TABLE "SubmissionReview"
  ADD CONSTRAINT "SubmissionReview_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionReview"
  ADD CONSTRAINT "SubmissionReview_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD COLUMN "size" INTEGER;

UPDATE "Attachment"
SET "size" = octet_length("data");

ALTER TABLE "Attachment"
  ALTER COLUMN "size" SET NOT NULL,
  ADD CONSTRAINT "Attachment_size_range"
    CHECK ("size" BETWEEN 1 AND 5242880),
  ADD CONSTRAINT "Attachment_size_matches_data"
    CHECK ("size" = octet_length("data"));
