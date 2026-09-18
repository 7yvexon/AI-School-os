UPDATE "User"
SET "email" = lower(btrim("email"));

ALTER TABLE "User"
  ADD CONSTRAINT "User_email_normalized"
    CHECK ("email" = lower(btrim("email")) AND char_length("email") BETWEEN 3 AND 254),
  ADD CONSTRAINT "User_teacher_approval_role"
    CHECK ("role" = 'TEACHER' OR "teacherApprovedAt" IS NULL),
  ADD CONSTRAINT "User_ai_consent_role"
    CHECK ("role" = 'STUDENT' OR "aiConsentAt" IS NULL);

CREATE UNIQUE INDEX "User_email_lower_key"
  ON "User"(lower("email"));

ALTER TABLE "Class"
  DROP CONSTRAINT "Class_teacherId_fkey",
  ADD CONSTRAINT "Class_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClassMember"
  ADD CONSTRAINT "ClassMember_removedAt_after_joinedAt"
    CHECK ("removedAt" IS NULL OR "removedAt" >= "joinedAt");

ALTER TABLE "Assignment"
  ADD CONSTRAINT "Assignment_archivedAt_after_createdAt"
    CHECK ("archivedAt" IS NULL OR "archivedAt" >= "createdAt");

CREATE TYPE "ReviewStatus" AS ENUM ('RETURNED', 'REVIEWED');

CREATE TYPE "AIMessageRole" AS ENUM ('user', 'assistant');

ALTER TABLE "AIMessage"
  DROP CONSTRAINT "AIMessage_role_allowed",
  ALTER COLUMN "role" TYPE "AIMessageRole"
    USING ("role"::text::"AIMessageRole");

ALTER TABLE "SubmissionReview"
  DROP CONSTRAINT "SubmissionReview_status_allowed",
  ALTER COLUMN "status" TYPE "ReviewStatus"
    USING ("status"::text::"ReviewStatus"),
  DROP CONSTRAINT "SubmissionReview_submissionId_fkey",
  ADD CONSTRAINT "SubmissionReview_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  DROP CONSTRAINT "SubmissionReview_reviewerId_fkey",
  ADD CONSTRAINT "SubmissionReview_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Submission"
  DROP CONSTRAINT "Submission_studentId_fkey",
  ADD CONSTRAINT "Submission_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Submission_status_consistency"
    CHECK (
      ("status" = 'SUBMITTED' AND "reviewedAt" IS NULL)
      OR ("status" IN ('RETURNED', 'REVIEWED') AND "reviewedAt" IS NOT NULL)
    ),
  ADD CONSTRAINT "Submission_returned_feedback"
    CHECK ("status" <> 'RETURNED' OR char_length(btrim("feedback")) > 0);

ALTER TABLE "AIConversation"
  DROP CONSTRAINT "AIConversation_userId_fkey",
  ADD CONSTRAINT "AIConversation_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AIUsage"
  ADD CONSTRAINT "AIUsage_day_format"
    CHECK (
      "day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND to_char(to_date("day", 'YYYY-MM-DD'), 'YYYY-MM-DD') = "day"
    );

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_name_length"
    CHECK (char_length(btrim("name")) BETWEEN 1 AND 200),
  ADD CONSTRAINT "Attachment_mime_allowed"
    CHECK ("mime" IN ('application/pdf', 'image/png', 'image/jpeg', 'text/plain'));
