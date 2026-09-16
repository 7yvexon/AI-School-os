ALTER TABLE "ClassMember"
  ADD COLUMN "removedAt" TIMESTAMP(3);

CREATE INDEX "ClassMember_classId_removedAt_idx"
  ON "ClassMember"("classId", "removedAt");
