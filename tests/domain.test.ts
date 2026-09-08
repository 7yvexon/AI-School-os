import { test } from "node:test";
import assert from "node:assert/strict";
import { aiContext, dailyLimit, dayKey, daysLeft } from "../src/lib/domain";
test("D-Day uses Seoul calendar days across midnight rather than 24-hour durations", () => {
  const beforeMidnight = new Date("2026-09-08T14:59:00Z");
  assert.equal(dayKey(beforeMidnight), "2026-09-08");
  assert.equal(dayKey(new Date("2026-09-08T15:00:00Z")), "2026-09-09");
  assert.equal(daysLeft("2026-09-08T15:01:00Z", beforeMidnight), 1);
  assert.equal(daysLeft("2026-09-07T14:59:00Z", beforeMidnight), -1);
});
test("Plan entitlements are enforced centrally", () => {
  assert.equal(dailyLimit("FREE"), 10);
  assert.equal(dailyLimit("PRO"), 100);
  assert.equal(dailyLimit("UNKNOWN"), 10);
});
test("AI context includes task and deadline while treating task content as reference data", () => {
  const context = aiContext(
    { name: "학생", school: "학교", grade: "2", classroom: "3" },
    {
      title: "보고서",
      description: "설명",
      rubric: "분석 25점",
      dueAt: new Date("2026-09-20T14:59:59Z"),
      class: { subject: "정보" },
    },
  );
  for (const key of [
    "보고서",
    "분석 25점",
    "정보",
    "currentDate",
    "daysRemaining",
    "참고 데이터",
    "완성본보다",
  ])
    assert.ok(context.includes(key));
});
