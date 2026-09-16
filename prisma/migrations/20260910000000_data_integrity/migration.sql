-- These CHECK constraints are intentionally maintained in SQL: Prisma 6 does
-- not represent CHECK constraints in schema.prisma. Keep them in future migrations.
-- The transaction is additive and never rewrites or deletes existing records.
-- If old data violates an invariant, fail atomically so it can be reviewed first.
BEGIN;

ALTER TABLE "AIUsage"
  ADD CONSTRAINT "AIUsage_count_nonnegative" CHECK ("count" >= 0),
  ADD CONSTRAINT "AIUsage_tokens_nonnegative" CHECK ("tokens" >= 0);

ALTER TABLE "AIMessage"
  ADD CONSTRAINT "AIMessage_role_allowed" CHECK ("role" IN ('user', 'assistant'));

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_size_limit" CHECK (octet_length("data") BETWEEN 1 AND 5242880);

ALTER TABLE "RateLimit"
  ADD CONSTRAINT "RateLimit_count_positive" CHECK ("count" >= 1);

COMMIT;
