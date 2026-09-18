import { z } from "zod";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  attachmentContentDisposition,
  attachmentDataSizeAllowed,
  sanitizeAttachmentName,
} from "@/lib/attachment";
import { MAX_ATTACHMENT_DOWNLOADS_PER_MINUTE } from "@/lib/limits";
import { RateLimitError, rateLimit } from "@/lib/rate-limit";
import { hashIdentifier, requestIp } from "@/lib/request";

const API_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};
function responseHeaders(extra?: HeadersInit) {
  const headers = new Headers(API_HEADERS);
  if (extra) {
    for (const [key, value] of new Headers(extra)) headers.set(key, value);
  }
  return headers;
}
const fail = (error: string, status: number, retryAfter?: number) =>
  Response.json(
    { error },
    {
      status,
      headers: responseHeaders(
        retryAfter === undefined
          ? undefined
          : { "Retry-After": String(retryAfter) },
      ),
    },
  );

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUser();
    if (!user) return fail("로그인이 필요합니다.", 401);
    if (user.role === "TEACHER" && !user.teacherApprovedAt)
      return fail("교사 승인이 필요합니다.", 403);
    const { id } = await params;
    const attachmentId = z.string().min(1).max(50).parse(id);
    try {
      if (process.env.TRUST_PROXY?.trim() === "true")
        await rateLimit(
          `attachment:ip:${hashIdentifier(requestIp(request.headers))}`,
          MAX_ATTACHMENT_DOWNLOADS_PER_MINUTE * 4,
          60000,
        );
      await rateLimit(
        `attachment:user:${hashIdentifier(user.id)}`,
        MAX_ATTACHMENT_DOWNLOADS_PER_MINUTE,
        60000,
      );
    } catch (error) {
      if (error instanceof RateLimitError)
        return fail(
          "잠시 후 다시 다운로드해 주세요.",
          429,
          error.retryAfterSeconds,
        );
      throw error;
    }
    const file = await db.attachment.findFirst({
      where: {
        id: attachmentId,
        assignment: {
          ...(user.role === "TEACHER" ? {} : { archivedAt: null }),
          class:
            user.role === "TEACHER"
              ? { teacherId: user.id }
              : { members: { some: { userId: user.id, removedAt: null } } },
        },
      },
      select: { name: true, size: true, data: true },
    });
    if (!file) return fail("첨부파일을 찾을 수 없습니다.", 404);
    if (
      !attachmentDataSizeAllowed(file.data) ||
      file.size !== file.data.byteLength
    )
      return fail("첨부파일을 불러오지 못했습니다.", 500);
    const name = sanitizeAttachmentName(file.name) ?? "download";
    return new Response(new Uint8Array(file.data), {
      headers: responseHeaders({
        "Content-Type": "application/octet-stream",
        "Content-Disposition": attachmentContentDisposition(name),
        "Content-Length": String(file.data.byteLength),
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return fail("첨부파일 경로를 확인해 주세요.", 400);
    return fail(
      "첨부파일을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
}
