import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aiContext,
  dailyLimit,
  dayKey,
  daysLeft,
  dday,
  isAssignmentType,
} from "../src/lib/domain";
test("D-Day uses Seoul calendar days across midnight rather than 24-hour durations", () => {
  const beforeMidnight = new Date("2026-09-08T14:59:00Z");
  assert.equal(dayKey(beforeMidnight), "2026-09-08");
  assert.equal(dayKey(new Date("2026-09-08T15:00:00Z")), "2026-09-09");
  assert.equal(daysLeft("2026-09-08T14:59:59Z", beforeMidnight), 0);
  assert.equal(daysLeft("2026-09-08T15:01:00Z", beforeMidnight), 1);
  assert.equal(daysLeft("2026-09-07T14:59:00Z", beforeMidnight), -1);
  assert.equal(
    daysLeft("2027-01-01T14:59:00Z", new Date("2026-12-31T15:00:00Z")),
    0,
  );
  assert.equal(
    daysLeft("2027-01-01T15:00:00Z", new Date("2026-12-31T15:00:00Z")),
    1,
  );
});
test("D-Day labels use calendar-day boundaries", () => {
  const now = new Date("2026-09-08T14:59:00Z");
  assert.equal(dday("2026-09-08T14:59:59Z", now), "D-Day");
  assert.equal(dday("2026-09-08T15:01:00Z", now), "D-1");
  assert.equal(dday("2026-09-07T14:59:00Z", now), "1일 지남");
});
test("Plan entitlements are enforced centrally", () => {
  assert.equal(dailyLimit("FREE"), 10);
  assert.equal(dailyLimit("PRO"), 100);
  assert.equal(dailyLimit("UNKNOWN"), 10);
});
test("AI context includes task and deadline while treating task content as reference data", () => {
  const student = {
    grade: "2",
    classroom: "3",
    name: "학생",
    school: "학교",
    email: "student@example.com",
  };
  const context = aiContext(student, {
    title: "보고서",
    description: "설명",
    rubric: "분석 25점",
    dueAt: new Date("2026-09-20T14:59:59Z"),
    class: { subject: "정보" },
  });
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
  const dataStart =
    context.indexOf("BEGIN_REFERENCE_DATA\n") + "BEGIN_REFERENCE_DATA\n".length;
  const dataEnd = context.indexOf("\nEND_REFERENCE_DATA", dataStart);
  const payload = JSON.parse(context.slice(dataStart, dataEnd));
  assert.deepEqual(payload.student, { grade: "2" });
  assert.equal(context.includes('"classroom"'), false);
  assert.equal(payload.student.name, undefined);
  assert.equal(payload.student.school, undefined);
  assert.equal(payload.student.email, undefined);
});
test("Assignment filters accept only own enum keys", () => {
  assert.equal(isAssignmentType("HOMEWORK"), true);
  assert.equal(isAssignmentType("toString"), false);
  assert.equal(isAssignmentType("__proto__"), false);
  assert.equal(isAssignmentType(null), false);
});
