ALTER TABLE "AssignmentProgress"
  DROP CONSTRAINT "AssignmentProgress_assignmentId_fkey",
  ADD CONSTRAINT "AssignmentProgress_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Submission"
  DROP CONSTRAINT "Submission_assignmentId_fkey",
  ADD CONSTRAINT "Submission_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AIConversation"
  DROP CONSTRAINT "AIConversation_assignmentId_fkey",
  ADD CONSTRAINT "AIConversation_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  DROP CONSTRAINT "Attachment_assignmentId_fkey",
  ADD CONSTRAINT "Attachment_assignmentId_fkey"
    FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
