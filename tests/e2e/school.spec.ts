import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { dayKey } from "../../src/lib/domain";
import { createClassCode } from "../../src/lib/class-code";
import { cleanupExpiredRecords } from "../../src/lib/database-maintenance";
import {
  MAX_AI_GLOBAL_REQUESTS_PER_DAY,
  MAX_ATTACHMENTS_PER_CLASS,
} from "../../src/lib/limits";
const db = new PrismaClient();
const e2eTestPassword =
  process.env.E2E_TEST_PASSWORD ?? randomBytes(24).toString("base64url");
const e2eOrigin = `http://localhost:${process.env.E2E_PORT ?? "3100"}`;
const futureDate = (days: number) =>
  dayKey(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
test.afterAll(() => db.$disconnect());
async function register(
  page: Page,
  email: string,
  role: "학생" | "선생님",
  name: string,
) {
  await page.goto("/register");
  await page.getByLabel("이름", { exact: true }).fill(name);
  await page.getByLabel(role, { exact: true }).check({ force: true });
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("전화번호").fill("010-0000-0000");
  await page.getByLabel("비밀번호").fill(e2eTestPassword);
  await page.getByRole("button", { name: "회원가입" }).click();
  if (role === "선생님") {
    await expect(page.getByRole("status")).toContainText("교사 가입 신청");
    await db.user.update({
      where: { email },
      data: { teacherApprovedAt: new Date() },
    });
    await page.goto("/login");
    await page.getByLabel("이메일").fill(email);
    await page.getByLabel("비밀번호").fill(e2eTestPassword);
    await page.getByRole("button", { name: "로그인" }).click();
  }
  await expect(page).toHaveURL(
    new RegExp(`/${role === "학생" ? "student" : "teacher"}/dashboard`),
  );
}

test("landing prompt accepts input and carries the intent to login", async ({
  page,
}) => {
  await page.goto("/");
  const prompt = page.getByLabel("AI에게 시작할 일 입력");
  const promptText = "오늘 탐구 과제를 세 단계로 나누고 싶어요.";

  await prompt.fill(promptText);
  await page.getByRole("button", { name: "과제 정리" }).click();
  await expect(page.getByRole("button", { name: "과제 정리" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(prompt).toHaveValue(promptText);
  await page
    .getByRole("button", { name: "입력한 문장으로 로그인하기" })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("방금 입력한 시작 문장")).toBeVisible();
  await expect(page.getByText(promptText)).toBeVisible();
});

test("teacher and student full workflow, scoped access, AI persistence and quota", async ({
  browser,
}) => {
  const stamp = Date.now();
  const dueDate = futureDate(7);
  const teacherContext = await browser.newContext();
  const teacher = await teacherContext.newPage();
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();
  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await register(
    teacher,
    `teacher-${stamp}@example.com`,
    "선생님",
    "테스트 선생님",
  );
  await teacher.goto("/teacher/classes/new");
  await teacher.getByLabel("클래스 이름").fill("E2E 탐구 수업");
  await teacher.getByLabel("과목", { exact: true }).fill("탐구");
  await teacher.getByRole("button", { name: "클래스 생성" }).click();
  await expect(teacher.locator(".class-code")).toBeVisible();
  const code = await teacher.locator(".class-code").innerText();
  const classUrl = teacher.url();
  const classId = classUrl.split("/").at(-1)!;
  await teacher.getByRole("link", { name: "과제 등록", exact: true }).click();
  await teacher.getByLabel("제목", { exact: true }).fill("E2E 탐구 과제");
  await teacher.getByLabel("종류", { exact: true }).selectOption("ASSESSMENT");
  await teacher.getByLabel("마감일", { exact: true }).fill(dueDate);
  await teacher
    .getByLabel("설명", { exact: true })
    .fill("관심 있는 주제를 조사하고 결과를 분석합니다.");
  await teacher
    .getByLabel("평가기준", { exact: false })
    .fill("주제 선정, 자료 조사, 분석, 보고서");
  await teacher.getByLabel("첨부파일", { exact: false }).setInputFiles({
    name: "rubric.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("데이터 선정과 분석"),
  });
  await teacher.getByRole("button", { name: "저장하기" }).click();
  await expect(
    teacher.getByRole("heading", { name: "E2E 탐구 과제", exact: true }),
  ).toBeVisible();
  const assignmentId = teacher.url().split("/").at(-1)!;
  await register(
    student,
    `student-${stamp}@example.com`,
    "학생",
    "테스트 학생",
  );
  await student.goto("/student/classes");
  await student.getByLabel("클래스 코드").fill(code.toLowerCase());
  await student
    .getByRole("button", { name: "클래스 참여", exact: true })
    .click();
  await expect(
    student.getByRole("heading", { name: "E2E 탐구 수업" }),
  ).toBeVisible();
  await student.goto("/student/dashboard");
  await expect(
    student
      .getByRole("heading", { name: "E2E 탐구 과제", exact: true })
      .first(),
  ).toBeVisible();
  await student.goto(`/student/assignments/${assignmentId}`);
  await expect(
    student.getByText("관심 있는 주제를 조사하고 결과를 분석합니다."),
  ).toBeVisible();
  const attachmentHref = await student
    .getByRole("link", { name: "rubric.txt" })
    .getAttribute("href");
  expect(attachmentHref).toBeTruthy();
  expect((await studentContext.request.get(attachmentHref!)).status()).toBe(
    200,
  );
  await db.attachment.createMany({
    data: Array.from({ length: MAX_ATTACHMENTS_PER_CLASS - 1 }, (_, i) => ({
      assignmentId,
      name: `quota-${stamp}-${i}.txt`,
      mime: "text/plain",
      size: 1,
      data: Buffer.from("x"),
      scanStatus: "CLEAN" as const,
    })),
  });
  await teacher.goto(`/teacher/assignments/${assignmentId}/edit`);
  await teacher.getByLabel("첨부파일", { exact: false }).setInputFiles({
    name: "quota-overflow.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("x"),
  });
  await teacher.getByRole("button", { name: "저장하기" }).click();
  await expect(teacher.locator(".alert-error")).toContainText(
    "클래스 첨부파일 개수 한도",
  );
  expect(await db.attachment.count({ where: { assignmentId } })).toBe(
    MAX_ATTACHMENTS_PER_CLASS,
  );
  expect(
    await db.attachmentUploadReservation.count({ where: { classId } }),
  ).toBe(0);
  await db.attachment.deleteMany({
    where: { assignmentId, name: `quota-${stamp}-0.txt` },
  });
  const owner = await db.user.findUniqueOrThrow({
    where: { email: `teacher-${stamp}@example.com` },
  });
  const reservation = await db.attachmentUploadReservation.create({
    data: {
      classId,
      teacherId: owner.id,
      size: 1,
      expiresAt: new Date(Date.now() + 120000),
    },
  });
  await teacher.getByLabel("첨부파일", { exact: false }).setInputFiles({
    name: "quota-overflow.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("x"),
  });
  await teacher.getByRole("button", { name: "저장하기" }).click();
  await expect(teacher.locator(".alert-error")).toContainText(
    "클래스 첨부파일 개수 한도",
  );
  expect(await db.attachment.count({ where: { assignmentId } })).toBe(
    MAX_ATTACHMENTS_PER_CLASS - 1,
  );
  expect(
    await db.attachmentUploadReservation.count({ where: { classId } }),
  ).toBe(1);
  await db.attachment.deleteMany({
    where: { assignmentId, name: { startsWith: `quota-${stamp}-` } },
  });
  await db.attachmentUploadReservation.delete({
    where: { id: reservation.id },
  });
  await teacher.goto(`/teacher/assignments/${assignmentId}`);
  await student
    .getByLabel("제출 내용", { exact: true })
    .fill("주제를 정하고 참고 자료를 비교해 본 탐구 결과입니다.");
  await student
    .getByRole("button", { name: "과제 제출하기", exact: true })
    .click();
  await expect(student.getByText("검토 대기", { exact: true })).toBeVisible();
  await teacher.reload();
  await expect(
    teacher.getByRole("heading", { name: "제출물 검토" }),
  ).toBeVisible();
  await expect(
    teacher.getByRole("article").getByRole("heading", {
      name: "테스트 학생",
      exact: true,
    }),
  ).toBeVisible();
  await teacher
    .getByLabel("검토 결과", { exact: true })
    .selectOption("RETURNED");
  await teacher
    .getByLabel("피드백", { exact: true })
    .fill("첫 문단에 참고 자료의 근거를 조금 더 적어 주세요.");
  await teacher.getByRole("button", { name: "검토 저장", exact: true }).click();
  await expect(
    teacher
      .getByRole("article")
      .locator("span.badge", { hasText: "수정 요청" }),
  ).toBeVisible();
  await student.reload();
  await expect(
    student.getByText("수정 후 재제출", { exact: true }),
  ).toBeVisible();
  await expect(
    student.getByText("첫 문단에 참고 자료의 근거를 조금 더 적어 주세요.", {
      exact: true,
    }),
  ).toBeVisible();
  await student.goto("/student/dashboard");
  await expect(
    student
      .getByRole("heading", { name: "E2E 탐구 과제", exact: true })
      .first(),
  ).toBeVisible();
  await student.goto(`/student/assignments/${assignmentId}`);
  await student
    .getByLabel("제출 내용", { exact: true })
    .fill("근거 자료를 보완한 최종 탐구 결과입니다.");
  await student
    .getByRole("button", { name: "다시 제출하기", exact: true })
    .click();
  await expect(student.getByText("검토 대기", { exact: true })).toBeVisible();
  await teacher.reload();
  await teacher
    .getByLabel("검토 결과", { exact: true })
    .selectOption("REVIEWED");
  await teacher
    .getByLabel("피드백", { exact: true })
    .fill("좋아요. 탐구 과정과 근거가 잘 정리되었습니다.");
  await teacher.getByRole("button", { name: "검토 저장", exact: true }).click();
  await expect(
    teacher
      .getByRole("article")
      .locator("span.badge", { hasText: "검토 완료" }),
  ).toBeVisible();
  await expect(
    teacher.getByText("검토 기록 2개", { exact: true }),
  ).toBeVisible();
  await student.reload();
  await expect(student.getByText("검토 완료", { exact: true })).toBeVisible();
  expect(
    (
      await studentContext.request.post("/api/ai", {
        headers: { origin: e2eOrigin },
        data: { assignmentId, message: "동의 전 접근 테스트" },
      })
    ).status(),
  ).toBe(428);
  await student.getByRole("button", { name: "AI 사용 동의하기" }).click();
  await expect(student.getByLabel("AI에게 질문")).toBeVisible();
  await student.getByRole("button", { name: "즐겨찾기", exact: true }).click();
  await student.getByLabel("AI에게 질문").fill("오늘 30분 동안 할 일을 알려줘");
  await student.getByRole("button", { name: "질문 보내기" }).click();
  await expect(student.locator(".message.assistant")).toContainText(
    "먼저 주제 선정",
  );
  await student.reload();
  await expect(student.locator(".message.user")).toContainText("오늘 30분");
  await expect(student.locator(".message.assistant")).toContainText(
    "먼저 주제 선정",
  );
  const learner = await db.user.findUniqueOrThrow({
    where: { email: `student-${stamp}@example.com` },
  });
  const usage = await db.aIUsage.findFirstOrThrow({
    where: { userId: learner.id },
  });
  expect(usage.count).toBe(1);
  expect(usage.tokens).toBe(123);
  const request = (message: string, origin = e2eOrigin) =>
    studentContext.request.post("/api/ai", {
      headers: { origin },
      data: { assignmentId, message },
    });
  const globalUsage = () =>
    db.rateLimit.findFirstOrThrow({
      where: { key: { startsWith: "ai:global:" } },
      select: { key: true, count: true },
    });
  expect((await request("test", "https://foreign.example")).status()).toBe(403);
  expect((await request("FAIL_PROVIDER")).status()).toBe(502);
  expect(
    (await db.aIUsage.findUniqueOrThrow({ where: { id: usage.id } })).count,
  ).toBe(2);
  expect((await globalUsage()).count).toBe(2);
  await db.aIUsage.update({ where: { id: usage.id }, data: { count: 9 } });
  const responses = await Promise.all([
    request("첫 질문"),
    request("둘째 질문"),
  ]);
  expect(responses.filter((r) => r.status() === 200)).toHaveLength(1);
  expect(responses.some((r) => [409, 429].includes(r.status()))).toBeTruthy();
  expect(
    (await db.aIUsage.findUniqueOrThrow({ where: { id: usage.id } })).count,
  ).toBe(10);
  expect((await globalUsage()).count).toBe(3);
  expect((await request("마지막 질문")).status()).toBe(429);
  expect((await globalUsage()).count).toBe(3);
  await db.rateLimit.deleteMany({
    where: {
      key: { startsWith: "ai:" },
      NOT: { key: { startsWith: "ai:global:" } },
    },
  });
  await db.aIUsage.update({ where: { id: usage.id }, data: { count: 9 } });
  const global = await globalUsage();
  await db.rateLimit.update({
    where: { key: global.key },
    data: { count: MAX_AI_GLOBAL_REQUESTS_PER_DAY },
  });
  const globallyLimited = await request("전역 한도 확인");
  expect(globallyLimited.status()).toBe(429);
  expect(globallyLimited.headers()["retry-after"]).toBeTruthy();
  expect((await globalUsage()).count).toBe(MAX_AI_GLOBAL_REQUESTS_PER_DAY);
  expect(
    (await db.aIUsage.findUniqueOrThrow({ where: { id: usage.id } })).count,
  ).toBe(9);
  await expect(
    student.getByRole("button", { name: "완료됨 · 취소하기" }),
  ).toBeVisible();
  await teacher.reload();
  await expect(teacher.getByText("1/1명 완료", { exact: false })).toBeVisible();
  await teacher.screenshot({
    path: "test-results/teacher-progress.png",
    fullPage: true,
  });
  await student.goto("/student/settings");
  await student.getByLabel("학교", { exact: true }).fill("테스트고등학교");
  await student.getByLabel("학년", { exact: true }).fill("2");
  await student.getByLabel("반", { exact: true }).fill("3");
  await student.getByRole("button", { name: "프로필 저장" }).click();
  await expect(student.getByRole("status")).toContainText("저장했습니다.");
  await student.goto("/student/calendar");
  await student.getByLabel("일정", { exact: true }).fill("E2E 개인 공부");
  await student.getByLabel("날짜", { exact: true }).fill(dayKey());
  await student.getByRole("button", { name: "일정 추가" }).click();
  await expect(student.locator(".calendar-event.personal")).toContainText(
    "E2E 개인 공부",
  );
  await student.goto("/student/dashboard");
  await expect(
    student.getByRole("heading", { name: "E2E 개인 공부" }),
  ).toBeVisible();
  await student.screenshot({
    path: "test-results/student-dashboard.png",
    fullPage: true,
  });
  await student.setViewportSize({ width: 390, height: 844 });
  await student.getByRole("button", { name: "메뉴 열기" }).click();
  await student
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("link", { name: "캘린더" })
    .click();
  await expect(student).toHaveURL(/student\/calendar/);
  student.on("dialog", (dialog) => dialog.accept());
  await student.getByRole("button", { name: "일정 삭제" }).click();
  await expect(student.getByText("아직 개인 일정이 없어요.")).toBeVisible();
  await student.getByRole("button", { name: "메뉴 열기" }).click();
  await student
    .getByRole("navigation", { name: "모바일 메뉴" })
    .getByRole("button", { name: "로그아웃" })
    .click();
  await expect(student).toHaveURL(`${e2eOrigin}/`);
  await student.goto("/login");
  await student.getByLabel("이메일").fill(`student-${stamp}@example.com`);
  await student.getByLabel("비밀번호").fill(e2eTestPassword);
  await student.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(student).toHaveURL(/student\/dashboard/);
  await student.setViewportSize({ width: 1280, height: 720 });
  await register(
    outsider,
    `outsider-${stamp}@example.com`,
    "학생",
    "외부 학생",
  );
  await outsider.goto(`/student/assignments/${assignmentId}`);
  await expect(
    outsider.getByRole("heading", { name: "페이지를 찾을 수 없어요" }),
  ).toBeVisible();
  expect((await outsiderContext.request.get(attachmentHref!)).status()).toBe(
    404,
  );
  expect(
    (
      await outsiderContext.request.post("/api/ai", {
        headers: { origin: e2eOrigin },
        data: { assignmentId, message: "접근 테스트" },
      })
    ).status(),
  ).toBe(404);
  await student.goto("/teacher/classes/new");
  await expect(student).toHaveURL(/student\/dashboard/);
  const teacher2Context = await browser.newContext();
  const teacher2 = await teacher2Context.newPage();
  await register(
    teacher2,
    `teacher2-${stamp}@example.com`,
    "선생님",
    "다른 선생님",
  );
  await teacher2.goto(`${classUrl}/assignments/new`);
  await expect(
    teacher2.getByRole("heading", { name: "페이지를 찾을 수 없어요" }),
  ).toBeVisible();
  await teacher2.goto(`/teacher/assignments/${assignmentId}/edit`);
  await expect(
    teacher2.getByRole("heading", { name: "페이지를 찾을 수 없어요" }),
  ).toBeVisible();
  await teacher.goto(`/teacher/assignments/${assignmentId}/edit`);
  await teacher.getByLabel("제목", { exact: true }).fill("수정된 E2E 과제");
  await teacher.getByRole("button", { name: "저장하기" }).click();
  await expect(
    teacher.getByRole("heading", { name: "수정된 E2E 과제" }),
  ).toBeVisible();
  teacher.on("dialog", (dialog) => dialog.accept());
  await teacher.getByRole("button", { name: "과제 보관", exact: true }).click();
  await expect(teacher).toHaveURL(classUrl);
  await expect(teacher.getByText("등록된 과제가 없어요.")).toBeVisible();
  await student.goto(`/student/assignments/${assignmentId}`);
  await expect(
    student.getByRole("heading", { name: "페이지를 찾을 수 없어요" }),
  ).toBeVisible();
  await teacher.getByRole("link", { name: /수정된 E2E 과제/ }).click();
  await expect(teacher.getByText("이 과제는 보관된 상태입니다.")).toBeVisible();
  await teacher.getByRole("button", { name: "과제 복원", exact: true }).click();
  await expect(
    teacher.getByRole("heading", { name: "수정된 E2E 과제", exact: true }),
  ).toBeVisible();
  await teacher.getByRole("button", { name: "과제 보관", exact: true }).click();
  await expect(teacher).toHaveURL(classUrl);
  const previousCode = await teacher.locator(".class-code").innerText();
  await teacher
    .getByRole("button", { name: "초대 코드 재발급", exact: true })
    .click();
  await expect
    .poll(() => teacher.locator(".class-code").innerText())
    .not.toBe(previousCode);
  const rotatedCode = await teacher.locator(".class-code").innerText();
  await outsider.goto("/student/classes");
  await outsider.getByLabel("클래스 코드").fill(code);
  await outsider
    .getByRole("button", { name: "클래스 참여", exact: true })
    .click();
  await expect(outsider.locator(".alert-error")).toContainText(
    "클래스 코드를 확인",
  );
  await teacher.getByRole("button", { name: "학생 제외", exact: true }).click();
  await expect(
    teacher.getByText("참여 학생 0명", { exact: true }),
  ).toBeVisible();
  await student.goto("/student/classes");
  await student.getByLabel("클래스 코드").fill(rotatedCode);
  await student
    .getByRole("button", { name: "클래스 참여", exact: true })
    .click();
  await expect(student.locator(".alert-error")).toContainText(
    "다시 참여할 수 없습니다",
  );
  await teacher
    .getByRole("button", { name: "학생 다시 초대", exact: true })
    .click();
  await expect(
    teacher.getByText("참여 학생 1명", { exact: true }),
  ).toBeVisible();
  await outsider.goto("/student/classes");
  await outsider.getByLabel("클래스 코드").fill(rotatedCode);
  let joinAttempt = Promise.resolve();
  await db.$transaction(
    async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "Class" WHERE "id" = ${classId} FOR UPDATE
      `;
      joinAttempt = outsider
        .getByRole("button", { name: "클래스 참여", exact: true })
        .click();
      await expect
        .poll(async () => {
          const waiting = await db.$queryRaw<{ count: number }[]>`
            SELECT count(*)::integer AS "count"
            FROM pg_stat_activity
            WHERE wait_event_type = 'Lock'
              AND query LIKE '%"Class"%'
              AND query LIKE '%"code"%'
          `;
          return waiting[0]?.count ?? 0;
        })
        .toBeGreaterThan(0);
      await tx.class.update({
        where: { id: classId },
        data: { code: createClassCode() },
      });
    },
    { timeout: 30000 },
  );
  await joinAttempt;
  await expect(outsider.locator(".alert-error")).toContainText(
    "클래스 코드를 확인",
  );
  const outsiderUser = await db.user.findUniqueOrThrow({
    where: { email: `outsider-${stamp}@example.com` },
  });
  expect(
    await db.classMember.count({
      where: { classId, userId: outsiderUser.id },
    }),
  ).toBe(0);
  await expect(
    db.assignment.delete({ where: { id: assignmentId } }),
  ).rejects.toThrow();
  await student.goto("/student/settings");
  await student
    .getByRole("button", { name: "AI 사용 동의 철회", exact: true })
    .click();
  await expect(
    student.getByRole("button", { name: "AI 사용 동의하기", exact: true }),
  ).toBeVisible();
  await student
    .getByRole("button", { name: "AI 대화 기록 삭제", exact: true })
    .click();
  await expect
    .poll(() => db.aIConversation.count({ where: { userId: learner.id } }))
    .toBe(0);
  await teacher.goto("/register");
  await teacher.getByLabel("이름", { exact: true }).fill("중복 가입 시도");
  await teacher.getByLabel("이메일").fill(`teacher-${stamp}@example.com`);
  await teacher.getByLabel("전화번호").fill("010-0000-0000");
  await teacher.getByLabel("비밀번호").fill(e2eTestPassword);
  await teacher.getByRole("button", { name: "회원가입" }).click();
  await expect(teacher.locator(".alert-error")).toContainText(
    "요청을 처리하지 못했습니다",
  );
  await outsiderContext.close();
  await teacherContext.close();
  await studentContext.close();
  await teacher2Context.close();
});
test("landing, reduced motion and mobile navigation have usable layouts", async ({
  page,
  browser,
}) => {
  const health = await page.context().request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({
    status: "ok",
    checks: { configuration: "ok", database: "ok" },
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /학교생활의.*다음 장면으로/,
    }),
  ).toBeVisible();
  await expect(page.locator(".deep-prompt")).toBeVisible();
  await expect(page.locator(".deep-hero__signals span")).toHaveCount(3);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const mobile = await mobileContext.newPage();
  await mobile.goto("/");
  await expect(
    mobile.getByRole("heading", {
      name: /학교생활의.*다음 장면으로/,
    }),
  ).toBeVisible();
  await expect(mobile.locator(".deep-prompt")).toBeVisible();
  expect(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await mobile.screenshot({
    path: "test-results/landing-mobile.png",
    fullPage: true,
  });
  await mobileContext.close();
});

test("quarantined attachments are rescanned across batches", async () => {
  const stamp = Date.now();
  const teacher = await db.user.create({
    data: {
      email: `scanner-${stamp}@example.com`,
      name: "검사 테스트 선생님",
      phone: "010-0000-0000",
      passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 12),
      role: "TEACHER",
      teacherApprovedAt: new Date(),
    },
  });
  const cls = await db.class.create({
    data: {
      teacherId: teacher.id,
      name: "첨부 검사 테스트",
      subject: "탐구",
      code: createClassCode(),
    },
  });
  const assignment = await db.assignment.create({
    data: {
      classId: cls.id,
      title: "재검사 테스트 과제",
      description: "격리 파일 재검사를 확인합니다.",
      rubric: "",
      type: "MATERIAL",
      dueAt: new Date(Date.now() + 7 * 86400000),
    },
  });
  await db.attachment.createMany({
    data: Array.from({ length: 30 }, (_, index) => ({
      assignmentId: assignment.id,
      name: `pending-${index}.txt`,
      mime: "text/plain",
      size: 1,
      data: Buffer.from("x"),
      scanStatus: "QUARANTINED" as const,
    })),
  });
  const scan = (testMode: string) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/scan-quarantined.ts"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: "test",
          E2E_TEST_MODE: testMode,
          CLAMAV_HOST: "",
          CLAMAV_SOCKET: "",
        },
        encoding: "utf8",
        timeout: 30000,
        windowsHide: true,
      },
    );
  const pendingRun = scan("false");
  expect(pendingRun.status).toBe(0);
  expect(pendingRun.stdout).toMatch(/pending=\d+/);
  expect(
    await db.attachment.count({
      where: { assignmentId: assignment.id, scanStatus: "QUARANTINED" },
    }),
  ).toBe(30);
  const cleanRun = scan("true");
  expect(cleanRun.status).toBe(0);
  expect(cleanRun.stdout).toMatch(/clean=\d+/);
  expect(
    await db.attachment.count({
      where: { assignmentId: assignment.id, scanStatus: "CLEAN" },
    }),
  ).toBe(30);
  const expiredReservation = await db.attachmentUploadReservation.create({
    data: {
      classId: cls.id,
      teacherId: teacher.id,
      size: 1,
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  const cleaned = await cleanupExpiredRecords(db);
  expect(cleaned.uploadReservations).toBeGreaterThan(0);
  expect(
    await db.attachmentUploadReservation.findUnique({
      where: { id: expiredReservation.id },
    }),
  ).toBeNull();
});
