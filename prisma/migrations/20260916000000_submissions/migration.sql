-- Store the student submission and teacher review lifecycle for each assignment.
CREATE TYPE "SubmissionStatus" AS ENUM ('SUBMITTED', 'RETURNED', 'REVIEWED');

CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "feedback" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Submission_assignmentId_studentId_key"
  ON "Submission"("assignmentId", "studentId");

CREATE INDEX "Submission_assignmentId_status_idx"
  ON "Submission"("assignmentId", "status");

CREATE INDEX "Submission_studentId_updatedAt_idx"
  ON "Submission"("studentId", "updatedAt");

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_assignmentId_fkey"
  FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
