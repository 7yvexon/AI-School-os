ALTER TABLE "AIMessage"
  ADD CONSTRAINT "AIMessage_content_length"
    CHECK (char_length("content") BETWEEN 1 AND 12000);

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_content_length"
    CHECK (char_length("content") BETWEEN 1 AND 20000),
  ADD CONSTRAINT "Submission_feedback_length"
    CHECK (char_length("feedback") <= 5000);

ALTER TABLE "SubmissionReview"
  ADD CONSTRAINT "SubmissionReview_feedback_length"
    CHECK (char_length("feedback") <= 5000);
