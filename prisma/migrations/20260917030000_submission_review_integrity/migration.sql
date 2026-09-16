ALTER TABLE "SubmissionReview"
  ADD CONSTRAINT "SubmissionReview_status_allowed"
    CHECK ("status" IN ('RETURNED', 'REVIEWED'));
