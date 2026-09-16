import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser();
  if (!user) return new Response("로그인이 필요합니다.", { status: 401 });
  if (user.role === "TEACHER" && !user.teacherApprovedAt)
    return new Response("교사 승인이 필요합니다.", { status: 403 });
  const { id } = await params;
  const file = await db.attachment.findFirst({
    where: {
      id,
      assignment: {
        ...(user.role === "TEACHER" ? {} : { archivedAt: null }),
        class:
          user.role === "TEACHER"
            ? { teacherId: user.id }
            : { members: { some: { userId: user.id, removedAt: null } } },
      },
    },
  });
  if (!file)
    return new Response("첨부파일을 찾을 수 없습니다.", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
