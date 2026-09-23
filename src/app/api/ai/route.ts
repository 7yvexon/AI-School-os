import { z } from "zod";
import { getUser } from "@/lib/auth";
import { accessibleAssignment } from "@/lib/access";
import { db } from "@/lib/db";
import { aiConfigured, completeChat, type ChatMessage } from "@/lib/ai";
import { aiContext, dailyLimit, dayKey } from "@/lib/domain";
import { RateLimitError, rateLimit } from "@/lib/rate-limit";
import { validateRateLimitConfig } from "@/lib/rate-limit-core";
import { hashIdentifier, requestIp } from "@/lib/request";
import { getRuntimeConfig } from "@/lib/env";
import {
  MAX_AI_HISTORY_CHARS,
  MAX_AI_HISTORY_MESSAGES,
  MAX_AI_GLOBAL_REQUESTS_PER_DAY,
  MAX_AI_REQUEST_BYTES,
} from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 90;
const API_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
function responseHeaders(extra?: HeadersInit) {
  const headers = new Headers(API_HEADERS);
  if (extra) {
    for (const [key, value] of new Headers(extra)) headers.set(key, value);
  }
  return headers;
}
const fail = (error: string, status: number, headers?: HeadersInit) =>
  Response.json({ error }, { status, headers: responseHeaders(headers) });
class ConsentRevokedError extends Error {}
class AssignmentAccessRevokedError extends Error {}
export async function POST(request: Request) {
  try {
    let config;
    try {
      config = getRuntimeConfig();
    } catch {
      return fail("서버 설정을 확인해 주세요.", 503);
    }
    const origin = config.appUrl;
    if (request.headers.get("origin") !== new URL(origin).origin)
      return fail("허용되지 않은 요청입니다.", 403);
    const user = await getUser();
    if (!user) return fail("로그인이 필요합니다.", 401);
    if (user.role !== "STUDENT")
      return fail("학생 계정만 사용할 수 있습니다.", 403);
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
    const contentType = request.headers.get("content-type");
    if (
      contentType &&
      contentType.split(";", 1)[0].trim().toLowerCase() !== "application/json"
    )
      return fail("JSON 형식의 질문만 보낼 수 있습니다.", 415);
    const contentLength = request.headers.get("content-length");
    if (
      contentLength !== null &&
      (!/^\d+$/.test(contentLength.trim()) ||
        Number(contentLength) > MAX_AI_REQUEST_BYTES)
    )
      return fail(
        Number(contentLength) > MAX_AI_REQUEST_BYTES
          ? "질문이 너무 깁니다."
          : "요청 형식을 확인해 주세요.",
        Number(contentLength) > MAX_AI_REQUEST_BYTES ? 413 : 400,
      );
    let input: { assignmentId: string; message: string };
    try {
      const reader = request.body?.getReader();
      if (!reader) return fail("질문을 입력해 주세요.", 400);
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let body = "";
      let bytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_AI_REQUEST_BYTES) {
          await reader.cancel().catch(() => undefined);
          return fail("질문이 너무 깁니다.", 413);
        }
        body += decoder.decode(chunk.value, { stream: true });
      }
      body += decoder.decode();
      input = z
        .object({
          assignmentId: z.string().trim().min(1).max(50),
          message: z.string().trim().min(1).max(2000),
        })
        .strict()
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
    const day = dayKey();
    const usage = await db.aIUsage.findUnique({
      where: { userId_day: { userId: user.id, day } },
      select: { count: true },
    });
    if ((usage?.count ?? 0) >= dailyLimit(user.plan))
      return fail(
        "오늘의 AI 사용 한도에 도달했습니다. 자정(한국 시간)에 초기화됩니다.",
        429,
      );
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
    const lockUntil = new Date(Date.now() + 90000);
    const lock = await db.aIConversation.updateMany({
      where: { id: conversation.id, busyUntil: { lte: new Date() } },
      data: { busyUntil: lockUntil },
    });
    if (!lock.count) return fail("이 과제의 이전 답변을 기다려 주세요.", 409);
    try {
      const history = await db.aIMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: MAX_AI_HISTORY_MESSAGES,
        select: { role: true, content: true },
      });
      const recentHistory: ChatMessage[] = [];
      let historyChars = 0;
      for (const message of history) {
        if (historyChars + message.content.length > MAX_AI_HISTORY_CHARS) break;
        recentHistory.push({
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        });
        historyChars += message.content.length;
      }
      recentHistory.reverse();
      const liveAssignment = await accessibleAssignment(
        input.assignmentId,
        user,
      );
      if (!liveAssignment) return fail("과제에 접근할 수 없습니다.", 404);
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: aiContext({ grade: user.grade }, liveAssignment),
        },
        ...recentHistory,
        { role: "user", content: input.message },
      ];
      const consent = await db.user.findUnique({
        where: { id: user.id },
        select: { aiConsentAt: true },
      });
      if (!consent?.aiConsentAt) return fail("AI 사용 동의가 필요합니다.", 428);
      const globalLimit = validateRateLimitConfig(
        "ai:global",
        MAX_AI_GLOBAL_REQUESTS_PER_DAY,
        86400000,
      );
      const reserved = await db.$transaction(async (tx) => {
        await tx.aIUsage.upsert({
          where: { userId_day: { userId: user.id, day } },
          create: { userId: user.id, day },
          update: {},
        });
        const usageResult = await tx.aIUsage.updateMany({
          where: { userId: user.id, day, count: { lt: dailyLimit(user.plan) } },
          data: { count: { increment: 1 } },
        });
        if (!usageResult.count) return false;
        const globalKey = `${globalLimit.key}:${globalLimit.bucket}`;
        const globalRecord = await tx.rateLimit.upsert({
          where: { key: globalKey },
          create: {
            key: globalKey,
            expiresAt: new Date(globalLimit.expiresAtMs),
          },
          update: { count: { increment: 1 } },
        });
        if (globalRecord.count > MAX_AI_GLOBAL_REQUESTS_PER_DAY)
          throw new RateLimitError(
            Math.max(
              1,
              Math.ceil((globalRecord.expiresAt.getTime() - Date.now()) / 1000),
            ),
          );
        return true;
      });
      if (!reserved)
        return fail(
          "오늘의 AI 사용 한도에 도달했습니다. 자정(한국 시간)에 초기화됩니다.",
          429,
        );
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
        const assignmentInfo = await tx.assignment.findUnique({
          where: { id: assignment.id },
          select: { classId: true },
        });
        if (!assignmentInfo) throw new AssignmentAccessRevokedError();
        await tx.$queryRaw`
        SELECT "id" FROM "ClassMember"
        WHERE "classId" = ${assignmentInfo.classId}
          AND "userId" = ${user.id}
        FOR UPDATE
      `;
        await tx.$queryRaw`
        SELECT "id" FROM "Assignment" WHERE "id" = ${assignment.id}
        FOR UPDATE
      `;
        const activeAssignment = await tx.assignment.findFirst({
          where: {
            id: assignment.id,
            archivedAt: null,
            class: {
              members: { some: { userId: user.id, removedAt: null } },
            },
          },
          select: { id: true },
        });
        if (!activeAssignment) throw new AssignmentAccessRevokedError();
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
      return Response.json(
        {
          message: {
            id: saved.answer.id,
            role: saved.answer.role,
            content: saved.answer.content,
          },
          used: saved.usage.count,
          limit: dailyLimit(user.plan),
        },
        { headers: responseHeaders() },
      );
    } catch (error) {
      if (error instanceof RateLimitError)
        return fail("잠시 후 다시 질문해 주세요.", 429, {
          "Retry-After": String(error.retryAfterSeconds),
        });
      if (error instanceof ConsentRevokedError)
        return fail("AI 사용 동의가 필요합니다.", 428);
      if (error instanceof AssignmentAccessRevokedError)
        return fail("과제에 접근할 수 없습니다.", 404);
      return fail(
        "답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        502,
      );
    } finally {
      try {
        await db.aIConversation.updateMany({
          where: { id: conversation.id, busyUntil: lockUntil },
          data: { busyUntil: new Date(0) },
        });
      } catch {}
    }
  } catch (error) {
    if (error instanceof RateLimitError)
      return fail("잠시 후 다시 질문해 주세요.", 429, {
        "Retry-After": String(error.retryAfterSeconds),
      });
    return fail("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
