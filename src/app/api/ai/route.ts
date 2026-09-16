import { z } from "zod";
import { getUser } from "@/lib/auth";
import { accessibleAssignment } from "@/lib/access";
import { db } from "@/lib/db";
import { aiConfigured, completeChat, type ChatMessage } from "@/lib/ai";
import { aiContext, dailyLimit, dayKey } from "@/lib/domain";
import { RateLimitError, rateLimit } from "@/lib/rate-limit";
import { hashIdentifier, requestIp } from "@/lib/request";

export const runtime = "nodejs";
export const maxDuration = 90;
const fail = (error: string, status: number, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers });
class ConsentRevokedError extends Error {}
export async function POST(request: Request) {
  const origin = process.env.APP_URL || new URL(request.url).origin;
  if (request.headers.get("origin") !== new URL(origin).origin)
    return fail("허용되지 않은 요청입니다.", 403);
  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.", 401);
  if (user.role !== "STUDENT")
    return fail("학생 계정만 사용할 수 있습니다.", 403);
  if (Number(request.headers.get("content-length")) > 20000)
    return fail("질문이 너무 깁니다.", 413);
  let input: { assignmentId: string; message: string };
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("질문을 입력해 주세요.", 400);
    const decoder = new TextDecoder();
    let body = "";
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 20000) {
        await reader.cancel();
        return fail("질문이 너무 깁니다.", 413);
      }
      body += decoder.decode(chunk.value, { stream: true });
    }
    body += decoder.decode();
    input = z
      .object({
        assignmentId: z.string().max(50),
        message: z.string().trim().min(1).max(2000),
      })
      .parse(JSON.parse(body));
  } catch {
    return fail("질문은 1~2,000자로 입력해 주세요.", 400);
  }
  const assignment = await accessibleAssignment(input.assignmentId, user);
  if (!assignment) return fail("과제에 접근할 수 없습니다.", 404);
  if (!user.aiConsentAt) return fail("AI 사용 동의가 필요합니다.", 428);
  if (!aiConfigured())
    return fail(
      "AI 연결이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.",
      503,
    );
  try {
    await rateLimit(
      `ai:ip:${hashIdentifier(requestIp(request.headers))}`,
      30,
      60000,
    );
    await rateLimit(`ai:${user.id}`, 6, 60000);
  } catch (error) {
    if (error instanceof RateLimitError)
      return fail("잠시 후 다시 질문해 주세요.", 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    throw error;
  }
  const conversation = await db.aIConversation.upsert({
    where: {
      userId_assignmentId: { userId: user.id, assignmentId: assignment.id },
    },
    create: {
      userId: user.id,
      assignmentId: assignment.id,
      busyUntil: new Date(0),
    },
    update: {},
  });
  const lock = await db.aIConversation.updateMany({
    where: { id: conversation.id, busyUntil: { lte: new Date() } },
    data: { busyUntil: new Date(Date.now() + 90000) },
  });
  if (!lock.count) return fail("이 과제의 이전 답변을 기다려 주세요.", 409);
  const day = dayKey();
  let reserved = false;
  let persisted = false;
  try {
    reserved = await db.$transaction(async (tx) => {
      await tx.aIUsage.upsert({
        where: { userId_day: { userId: user.id, day } },
        create: { userId: user.id, day },
        update: {},
      });
      const result = await tx.aIUsage.updateMany({
        where: { userId: user.id, day, count: { lt: dailyLimit(user.plan) } },
        data: { count: { increment: 1 } },
      });
      return result.count === 1;
    });
    if (!reserved)
      return fail(
        "오늘의 AI 사용 한도에 도달했습니다. 자정(한국 시간)에 초기화됩니다.",
        429,
      );
    const history = await db.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 16,
    });
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: aiContext(
          {
            grade: user.grade,
            classroom: user.classroom,
          },
          assignment,
        ),
      },
      ...history.reverse().map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      })),
      { role: "user", content: input.message },
    ];
    const consent = await db.user.findUnique({
      where: { id: user.id },
      select: { aiConsentAt: true },
    });
    if (!consent?.aiConsentAt) return fail("AI 사용 동의가 필요합니다.", 428);
    const liveAssignment = await accessibleAssignment(input.assignmentId, user);
    if (!liveAssignment) return fail("과제에 접근할 수 없습니다.", 404);
    const reply = await completeChat(messages);
    const liveConversation = await db.aIConversation.findUnique({
      where: { id: conversation.id },
      select: { id: true },
    });
    if (!liveConversation) return fail("AI 대화 기록이 삭제되었습니다.", 410);
    const latestConsent = await db.user.findUnique({
      where: { id: user.id },
      select: { aiConsentAt: true },
    });
    if (!latestConsent?.aiConsentAt)
      return fail("AI 사용 동의가 필요합니다.", 428);
    const saved = await db.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
      `;
      const lockedUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { aiConsentAt: true },
      });
      if (!lockedUser?.aiConsentAt) throw new ConsentRevokedError();
      await tx.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: input.message,
        },
      });
      const answer = await tx.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: reply.content,
          createdAt: new Date(Date.now() + 1),
        },
      });
      const usage = await tx.aIUsage.update({
        where: { userId_day: { userId: user.id, day } },
        data: { tokens: { increment: reply.tokens } },
      });
      return { answer, usage };
    });
    persisted = true;
    return Response.json({
      message: saved.answer,
      used: saved.usage.count,
      limit: dailyLimit(user.plan),
    });
  } catch (error) {
    if (error instanceof ConsentRevokedError)
      return fail("AI 사용 동의가 필요합니다.", 428);
    return fail(
      "답변을 생성하지 못했습니다. 사용 횟수는 차감되지 않습니다. 잠시 후 다시 시도해 주세요.",
      502,
    );
  } finally {
    if (reserved && !persisted)
      await db.aIUsage.updateMany({
        where: { userId: user.id, day, count: { gt: 0 } },
        data: { count: { decrement: 1 } },
      });
    await db.aIConversation.updateMany({
      where: { id: conversation.id },
      data: { busyUntil: new Date(0) },
    });
  }
}
