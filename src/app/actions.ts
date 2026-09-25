"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createSession, logoutSession, requireUser } from "@/lib/auth";
import { ownedClass, accessibleAssignment } from "@/lib/access";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";
import { hashIdentifier, requestIp } from "@/lib/request";
import { createClassCode } from "@/lib/class-code";
import { aiProviderKey } from "@/lib/ai";
import { scanAttachmentData } from "@/lib/attachment-scanner";
import {
  attachmentDataSizeAllowed,
  attachmentMimeMatchesData,
  sanitizeAttachmentName,
} from "@/lib/attachment";
import {
  ATTACHMENT_UPLOAD_RESERVATION_MS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_BYTES_PER_CLASS,
  MAX_ATTACHMENT_BYTES_PER_TEACHER,
  MAX_CLASSES_PER_TEACHER,
  MAX_ATTACHMENTS_PER_CLASS,
  MAX_PERSONAL_EVENTS_PER_USER,
} from "@/lib/limits";
const text = (max: number) =>
  z.string().trim().min(1, "필수 항목을 입력해 주세요.").max(max);
const passwordSchema = z
  .string()
  .min(10, "비밀번호는 10자 이상이어야 합니다.")
  .max(72)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.",
  );
const due = z.iso.date().transform((v) => new Date(`${v}T23:59:59+09:00`));
const reviewStatus = z.enum(["RETURNED", "REVIEWED"]);
const operation = z.enum([
  "profile",
  "join",
  "class",
  "class-code-rotate",
  "member-remove",
  "member-restore",
  "ai-consent",
  "ai-consent-revoke",
  "ai-conversations-delete",
  "assignment",
  "delete",
  "assignment-archive",
  "assignment-restore",
  "submission",
  "submission-review",
  "attachment-delete",
  "progress",
  "event",
  "event-update",
  "event-delete",
]);
const attachmentMime = z.enum([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
export type ActionState = {
  error?: string;
  success?: string;
  values?: Record<string, string>;
};
class ActionError extends Error {}
function isEmptyFileInput(value: unknown) {
  return (
    value instanceof File &&
    value.name === "blob" &&
    value.type === "application/octet-stream" &&
    value.size === 0
  );
}
function isUniqueConstraintError(e: unknown) {
  return (
    typeof e === "object" && e !== null && "code" in e && e.code === "P2002"
  );
}
async function createClassWithUniqueCode(data: {
  name: string;
  subject: string;
  teacherId: string;
}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "User" WHERE "id" = ${data.teacherId} FOR UPDATE
        `;
        const count = await tx.class.count({
          where: { teacherId: data.teacherId },
        });
        if (count >= MAX_CLASSES_PER_TEACHER)
          throw new ActionError("선생님별 클래스 생성 한도에 도달했습니다.");
        return tx.class.create({
          data: {
            ...data,
            code: createClassCode(),
          },
        });
      });
    } catch (e) {
      if (!isUniqueConstraintError(e)) throw e;
    }
  }
  throw new ActionError("초대 코드를 발급하지 못했습니다.");
}
async function rotateClassCode(classId: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.class.update({
        where: { id: classId },
        data: { code: createClassCode() },
      });
    } catch (e) {
      if (!isUniqueConstraintError(e)) throw e;
    }
  }
  throw new ActionError("초대 코드를 발급하지 못했습니다.");
}
async function requireAttachmentCapacity(
  client: Pick<Prisma.TransactionClient, "attachment">,
  classId: string,
  teacherId: string,
  size: number,
  pending: { classCount: number; classBytes: number; teacherBytes: number },
) {
  const where = { assignment: { classId } };
  const count = await client.attachment.count({ where });
  if (count + pending.classCount >= MAX_ATTACHMENTS_PER_CLASS)
    throw new ActionError("클래스 첨부파일 개수 한도에 도달했습니다.");
  const total = await client.attachment.aggregate({
    where,
    _sum: { size: true },
  });
  if (
    (total._sum.size ?? 0) + pending.classBytes + size >
    MAX_ATTACHMENT_BYTES_PER_CLASS
  )
    throw new ActionError("클래스 첨부파일 총용량 한도에 도달했습니다.");
  const teacherTotal = await client.attachment.aggregate({
    where: { assignment: { class: { teacherId } } },
    _sum: { size: true },
  });
  if (
    (teacherTotal._sum.size ?? 0) + pending.teacherBytes + size >
    MAX_ATTACHMENT_BYTES_PER_TEACHER
  )
    throw new ActionError("선생님별 첨부파일 총용량 한도에 도달했습니다.");
}
async function activeAttachmentReservations(
  client: Pick<Prisma.TransactionClient, "attachmentUploadReservation">,
  classId: string,
  teacherId: string,
) {
  const reservations = await client.attachmentUploadReservation.findMany({
    where: {
      expiresAt: { gt: new Date() },
      OR: [{ classId }, { teacherId }],
    },
    select: { classId: true, teacherId: true, size: true },
  });
  const pending = { classCount: 0, classBytes: 0, teacherBytes: 0 };
  for (const reservation of reservations) {
    if (reservation.classId === classId) {
      pending.classCount++;
      pending.classBytes += reservation.size;
    }
    if (reservation.teacherId === teacherId)
      pending.teacherBytes += reservation.size;
  }
  return pending;
}
async function reserveAttachmentUpload(
  classId: string,
  teacherId: string,
  size: number,
) {
  return db.$transaction(async (tx) => {
    const users = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "User" WHERE "id" = ${teacherId} FOR UPDATE
    `;
    const classes = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Class"
      WHERE "id" = ${classId} AND "teacherId" = ${teacherId}
      FOR UPDATE
    `;
    if (!users.length || !classes.length) throw Error();
    const pending = await activeAttachmentReservations(tx, classId, teacherId);
    await requireAttachmentCapacity(tx, classId, teacherId, size, pending);
    return tx.attachmentUploadReservation.create({
      data: {
        classId,
        teacherId,
        size,
        expiresAt: new Date(Date.now() + ATTACHMENT_UPLOAD_RESERVATION_MS),
      },
    });
  });
}
function message(e: unknown) {
  return e instanceof z.ZodError
    ? e.issues[0].message
    : e instanceof ActionError
      ? e.message
      : e instanceof RateLimitError ||
          (e instanceof Error && /요청이 너무/.test(e.message))
        ? e.message
        : "요청을 처리하지 못했습니다. 입력과 접근 권한을 확인해 주세요.";
}
export async function authenticate(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  let target = "";
  let mode: "login" | "register" | undefined;
  try {
    mode = z.enum(["login", "register"]).parse(form.get("mode"));
    const data = z
      .object({
        email: z
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
      })
      .extend({ password: passwordSchema })
      .parse(Object.fromEntries(form));
    const submittedPassword = "password" in data ? data.password : undefined;
    const ip = requestIp(await headers());
    await rateLimit(`auth:ip:${hashIdentifier(ip)}`, 30, 15 * 60000);
    if (mode === "register") {
      await rateLimit(`register:ip:${hashIdentifier(ip)}`, 5, 60 * 60000);
      await rateLimit(
        `register:email-ip:${hashIdentifier(`${data.email}:${ip}`)}`,
        3,
        60 * 60000,
      );
    }
    let user;
    if (mode === "register") {
      const profile = z
        .object({ name: text(40), role: z.enum(["STUDENT", "TEACHER"]) })
        .parse(Object.fromEntries(form));
      user = await db.user.create({
        data: {
          ...profile,
          email: data.email,
          passwordHash: await bcrypt.hash(
            passwordSchema.parse(submittedPassword),
            12,
          ),
          teacherApprovedAt: null,
        },
      });
    } else {
      user = await db.user.findUnique({ where: { email: data.email } });
      const valid = await bcrypt.compare(
        submittedPassword ?? "",
        user?.passwordHash ??
          "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5wZOkJ/KLCNNv9ABeDH9bOiSDDbpUei",
      );
      if (!user || !valid) {
        await rateLimit(
          `auth:email-ip:${hashIdentifier(`${data.email}:${ip}`)}`,
          10,
          15 * 60000,
        );
        return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
      }
    }
    if (user.role === "TEACHER" && !user.teacherApprovedAt) {
      if (mode === "register")
        return {
          success:
            "교사 가입 신청이 접수되었습니다. 운영 담당자가 승인하면 로그인할 수 있습니다.",
        };
      throw new ActionError("교사 승인이 필요합니다.");
    }
    await createSession(user.id);
    target = `/${user.role.toLowerCase()}/dashboard`;
  } catch (e) {
    if (mode === "register" && isUniqueConstraintError(e))
      return {
        error:
          "가입을 완료하지 못했어요. 이 이메일로 이미 계정이 있다면 아래 로그인 링크를 이용해 주세요.",
      };
    return { error: message(e) };
  }
  redirect(target);
}
export async function logout() {
  await logoutSession();
  redirect("/");
}
export async function mutate(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  let target = "";
  let successMessage = "저장했습니다.";
  try {
    const ip = requestIp(await headers());
    await rateLimit(`write:ip:${hashIdentifier(ip)}`, 200, 60000);
    await rateLimit(`write:${user.id}`, 100, 60000);
    const op = operation.parse(form.get("op"));
    const raw = Object.fromEntries(form);
    if (op === "profile") {
      const data = z
        .object({
          name: text(40),
          school: z.string().trim().max(100),
          grade: z.string().trim().max(10),
          classroom: z.string().trim().max(10),
        })
        .parse(raw);
      await db.user.update({ where: { id: user.id }, data });
    } else if (op === "join") {
      if (user.role !== "STUDENT") throw Error();
      const code = z
        .string()
        .trim()
        .min(1, "클래스 코드를 입력해 주세요.")
        .max(21)
        .transform((value) => value.toUpperCase())
        .refine(
          (value) => /^BSS-[A-Z0-9]{6,16}$/.test(value),
          "클래스 코드 형식을 확인해 주세요.",
        )
        .parse(form.get("code"));
      const ip = requestIp(await headers());
      await rateLimit(`join:ip:${hashIdentifier(ip)}`, 30, 60000);
      await rateLimit(`join:user:${user.id}`, 20, 60000);
      const joined = await db.$transaction(async (tx) => {
        const classes = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "Class" WHERE "code" = ${code} FOR UPDATE
        `;
        const cls = classes[0];
        if (!cls) return { status: "invalid" } as const;
        const existingMember = await tx.classMember.findUnique({
          where: { userId_classId: { userId: user.id, classId: cls.id } },
        });
        if (existingMember?.removedAt) return { status: "removed" } as const;
        await tx.classMember.upsert({
          where: { userId_classId: { userId: user.id, classId: cls.id } },
          create: { userId: user.id, classId: cls.id },
          update: {},
        });
        return { status: "joined", classId: cls.id } as const;
      });
      if (joined.status === "invalid") {
        await rateLimit(`join:code:${hashIdentifier(code)}`, 20, 60000);
        return { error: "클래스 코드를 확인해 주세요." };
      }
      if (joined.status === "removed")
        return {
          error:
            "이 계정은 이 클래스에서 제외되어 있어요. 담당 선생님에게 참여 복원을 요청해 주세요.",
        };
      target = `/student/classes/${joined.classId}`;
    } else if (op === "class") {
      if (user.role !== "TEACHER") throw Error();
      const data = z.object({ name: text(80), subject: text(40) }).parse(raw);
      const cls = await createClassWithUniqueCode({
        ...data,
        teacherId: user.id,
      });
      target = `/teacher/classes/${cls.id}`;
    } else if (op === "class-code-rotate") {
      if (user.role !== "TEACHER") throw Error();
      const classId = text(50).parse(form.get("classId"));
      if (!(await ownedClass(classId, user.id))) throw Error();
      await rotateClassCode(classId);
    } else if (op === "member-remove") {
      if (user.role !== "TEACHER") throw Error();
      const memberId = text(50).parse(form.get("memberId"));
      const result = await db.classMember.updateMany({
        where: {
          id: memberId,
          removedAt: null,
          class: { teacherId: user.id },
        },
        data: { removedAt: new Date() },
      });
      if (result.count !== 1) throw Error();
    } else if (op === "member-restore") {
      if (user.role !== "TEACHER") throw Error();
      const memberId = text(50).parse(form.get("memberId"));
      const result = await db.classMember.updateMany({
        where: {
          id: memberId,
          removedAt: { not: null },
          class: { teacherId: user.id },
        },
        data: { removedAt: null },
      });
      if (result.count !== 1) throw Error();
    } else if (op === "ai-consent") {
      if (user.role !== "STUDENT") throw Error();
      const providerKey = aiProviderKey();
      if (!providerKey)
        throw new ActionError("AI 제공자가 설정된 뒤에 동의할 수 있습니다.");
      await db.user.update({
        where: { id: user.id },
        data: { aiConsentAt: new Date(), aiConsentProviderKey: providerKey },
      });
      successMessage = "AI 사용 동의를 저장했습니다.";
    } else if (op === "ai-consent-revoke") {
      if (user.role !== "STUDENT") throw Error();
      await db.user.update({
        where: { id: user.id },
        data: { aiConsentAt: null, aiConsentProviderKey: null },
      });
      successMessage =
        "새 AI 요청은 차단됩니다. 이미 진행 중인 질문은 외부 제공자에게 전송될 수 있습니다.";
    } else if (op === "ai-conversations-delete") {
      if (user.role !== "STUDENT") throw Error();
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
        `;
        await tx.user.update({
          where: { id: user.id },
          data: { aiHistoryVersion: { increment: 1 } },
        });
        await tx.aIConversation.deleteMany({ where: { userId: user.id } });
      });
      successMessage =
        "저장된 AI 대화를 삭제했습니다. 진행 중인 요청은 답변을 마친 뒤 기록되지 않으며, 다음 질문부터 새 기록이 시작됩니다.";
    } else if (op === "assignment") {
      if (user.role !== "TEACHER") throw Error();
      const classId = text(50).parse(form.get("classId"));
      if (!(await ownedClass(classId, user.id))) throw Error();
      const data = z
        .object({
          title: text(150),
          description: text(10000),
          rubric: z.string().max(5000),
          type: z.enum(["HOMEWORK", "ASSESSMENT", "EXAM", "MATERIAL"]),
          dueAt: due,
        })
        .parse(raw);
      const idValue = form.get("id");
      const id =
        idValue === null ? "" : z.string().trim().max(50).parse(idValue);
      if (id && !(await db.assignment.findFirst({ where: { id, classId } })))
        throw Error();
      const file = form.get("file");
      let attachment:
        | {
            name: string;
            mime: string;
            size: number;
            data: Uint8Array<ArrayBuffer>;
          }
        | undefined;
      if (file !== null && !(file instanceof File))
        throw new ActionError("첨부파일을 확인해 주세요.");
      if (file instanceof File && file.name && !isEmptyFileInput(file)) {
        if (
          !Number.isSafeInteger(file.size) ||
          file.size > MAX_ATTACHMENT_BYTES
        )
          throw new ActionError("첨부파일은 5MB 이하여야 합니다.");
        if (file.size === 0)
          throw new ActionError("빈 첨부파일은 올릴 수 없습니다.");
        const mime = attachmentMime.safeParse(file.type);
        if (!mime.success)
          throw new ActionError(
            "PDF, PNG, JPG, TXT 파일만 첨부할 수 있습니다.",
          );
        const data = new Uint8Array(await file.arrayBuffer());
        if (data.byteLength !== file.size || !attachmentDataSizeAllowed(data))
          throw new ActionError("첨부파일은 5MB 이하여야 합니다.");
        const name = sanitizeAttachmentName(file.name);
        if (!name) throw new ActionError("첨부파일 이름을 확인해 주세요.");
        const extension = name.split(".").pop()?.toLowerCase();
        const expectedExtensions: Record<string, string[]> = {
          "application/pdf": ["pdf"],
          "image/png": ["png"],
          "image/jpeg": ["jpg", "jpeg"],
          "text/plain": ["txt"],
        };
        if (!extension || !expectedExtensions[mime.data].includes(extension))
          throw new ActionError("파일 확장자와 내용 형식이 일치하지 않습니다.");
        if (!attachmentMimeMatchesData(mime.data, data))
          throw new ActionError("파일 형식과 내용이 일치하지 않습니다.");
        attachment = {
          name,
          mime: mime.data,
          size: data.byteLength,
          data,
        };
      }
      const reservation = attachment
        ? await reserveAttachmentUpload(classId, user.id, attachment.size)
        : null;
      try {
        const attachmentScan = attachment
          ? await scanAttachmentData(attachment.data)
          : null;
        if (attachmentScan?.status === "INFECTED")
          throw new ActionError(
            "안전하지 않은 첨부파일로 판단되어 업로드할 수 없습니다.",
          );
        const result = await db.$transaction(async (tx) => {
          if (attachment && attachmentScan && reservation) {
            await tx.$queryRaw`
              SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
            `;
            await tx.$queryRaw`
              SELECT "id" FROM "Class" WHERE "id" = ${classId} FOR UPDATE
            `;
            const released = await tx.attachmentUploadReservation.deleteMany({
              where: { id: reservation.id, classId, teacherId: user.id },
            });
            if (!released.count)
              throw new ActionError(
                "첨부파일 검사 예약이 만료되었습니다. 다시 시도해 주세요.",
              );
            const pending = await activeAttachmentReservations(
              tx,
              classId,
              user.id,
            );
            await requireAttachmentCapacity(
              tx,
              classId,
              user.id,
              attachment.size,
              pending,
            );
          }
          const a = id
            ? await tx.assignment.update({ where: { id }, data })
            : await tx.assignment.create({ data: { ...data, classId } });
          if (attachment && attachmentScan) {
            await tx.attachment.create({
              data: {
                ...attachment,
                assignmentId: a.id,
                scanStatus:
                  attachmentScan.status === "CLEAN"
                    ? "CLEAN"
                    : attachmentScan.status === "ERROR"
                      ? "SCAN_ERROR"
                      : "QUARANTINED",
                scannedAt:
                  attachmentScan.status === "UNAVAILABLE" ? null : new Date(),
                scanEngine: attachmentScan.engine,
              },
            });
          }
          return a;
        });
        if (attachmentScan && attachmentScan.status !== "CLEAN") {
          successMessage =
            attachmentScan.status === "UNAVAILABLE"
              ? "과제를 저장했습니다. 첨부파일은 검사 서비스가 없어 검사 대기 상태로 보관되었습니다."
              : "과제를 저장했습니다. 첨부파일 검사에 실패해 검사 대기 상태로 보관되었습니다.";
        }
        target = `/teacher/assignments/${result.id}`;
      } finally {
        if (reservation)
          await db.attachmentUploadReservation
            .deleteMany({ where: { id: reservation.id } })
            .catch(() => undefined);
      }
    } else if (op === "delete" || op === "assignment-archive") {
      const id = text(50).parse(form.get("id"));
      const a = await accessibleAssignment(id, user, { includeArchived: true });
      if (user.role !== "TEACHER" || !a) throw Error();
      await db.assignment.update({
        where: { id },
        data: { archivedAt: a.archivedAt ?? new Date() },
      });
      target = `/teacher/classes/${a.classId}`;
    } else if (op === "assignment-restore") {
      if (user.role !== "TEACHER") throw Error();
      const id = text(50).parse(form.get("id"));
      const a = await accessibleAssignment(id, user, { includeArchived: true });
      if (!a) throw Error();
      await db.assignment.update({ where: { id }, data: { archivedAt: null } });
      target = `/teacher/assignments/${a.id}`;
    } else if (op === "submission") {
      if (user.role !== "STUDENT") throw Error();
      const assignmentId = text(50).parse(form.get("assignmentId"));
      if (!(await accessibleAssignment(assignmentId, user))) throw Error();
      const content = text(20000).parse(form.get("content"));
      await db.$transaction(async (tx) => {
        const assignmentInfo = await tx.assignment.findUnique({
          where: { id: assignmentId },
          select: { classId: true },
        });
        if (!assignmentInfo) throw new ActionError("과제를 찾을 수 없습니다.");
        await tx.$queryRaw`
          SELECT "id" FROM "ClassMember"
          WHERE "classId" = ${assignmentInfo.classId}
            AND "userId" = ${user.id}
          FOR UPDATE
        `;
        await tx.$queryRaw`
          SELECT "id" FROM "Assignment" WHERE "id" = ${assignmentId}
          FOR UPDATE
        `;
        const activeAssignment = await tx.assignment.findFirst({
          where: {
            id: assignmentId,
            archivedAt: null,
            class: {
              members: { some: { userId: user.id, removedAt: null } },
            },
          },
          select: { id: true },
        });
        if (!activeAssignment)
          throw new ActionError("과제에 접근할 수 없습니다.");
        await tx.$queryRaw`
          SELECT "id" FROM "Submission"
          WHERE "assignmentId" = ${assignmentId} AND "studentId" = ${user.id}
          FOR UPDATE
        `;
        const existing = await tx.submission.findUnique({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: user.id,
            },
          },
        });
        if (existing?.status === "REVIEWED")
          throw new ActionError(
            "검토가 완료된 제출물은 수정할 수 없습니다. 선생님에게 다시 제출할 수 있는지 문의해 주세요.",
          );
        if (existing?.status === "SUBMITTED")
          throw new ActionError(
            "검토 대기 상태인 제출물은 수정할 수 없습니다. 선생님의 검토 결과를 기다려 주세요.",
          );
        await tx.submission.upsert({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: user.id,
            },
          },
          create: {
            assignmentId,
            studentId: user.id,
            content,
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
          update: {
            content,
            status: "SUBMITTED",
            submittedAt: new Date(),
            reviewedAt: null,
            feedback: "",
          },
        });
        await tx.assignmentProgress.upsert({
          where: {
            userId_assignmentId: {
              userId: user.id,
              assignmentId,
            },
          },
          create: { userId: user.id, assignmentId, completed: true },
          update: { completed: true },
        });
      });
      target = `/student/assignments/${assignmentId}`;
    } else if (op === "submission-review") {
      if (user.role !== "TEACHER") throw Error();
      const submissionId = text(50).parse(form.get("submissionId"));
      const status = reviewStatus.parse(form.get("status"));
      const feedback = z.string().trim().max(5000).parse(form.get("feedback"));
      const expectedUpdatedAt = z
        .string()
        .trim()
        .min(1)
        .max(40)
        .parse(form.get("updatedAt"));
      const expectedUpdatedAtMs = Date.parse(expectedUpdatedAt);
      if (!Number.isFinite(expectedUpdatedAtMs))
        throw new ActionError("제출물 버전을 확인할 수 없습니다.");
      const submission = await db.submission.findFirst({
        where: {
          id: submissionId,
          assignment: { class: { teacherId: user.id } },
        },
      });
      if (!submission) throw Error();
      if (status === "RETURNED" && !feedback)
        return {
          error: "수정 요청을 보낼 때는 학생에게 전달할 의견을 입력해 주세요.",
        };
      const reviewCreated = await db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "Submission"
          WHERE "id" = ${submissionId}
          FOR UPDATE
        `;
        const current = await tx.submission.findUnique({
          where: { id: submissionId },
        });
        if (!current) throw new ActionError("제출물이 이미 변경되었습니다.");
        if (current.updatedAt.getTime() !== expectedUpdatedAtMs)
          throw new ActionError(
            "다른 검토가 먼저 저장되었습니다. 페이지를 새로고침해 주세요.",
          );
        if (current.status === "RETURNED" && status === "REVIEWED")
          throw new ActionError(
            "학생이 수정한 내용을 다시 제출한 뒤에 검토를 완료할 수 있습니다.",
          );
        if (current.status === status && current.feedback === feedback)
          return false;
        await tx.submission.update({
          where: { id: submissionId },
          data: { status, feedback, reviewedAt: new Date() },
        });
        await tx.submissionReview.create({
          data: {
            submissionId,
            reviewerId: user.id,
            status,
            feedback,
            submissionContent: current.content,
          },
        });
        await tx.assignmentProgress.upsert({
          where: {
            userId_assignmentId: {
              userId: current.studentId,
              assignmentId: current.assignmentId,
            },
          },
          create: {
            userId: current.studentId,
            assignmentId: current.assignmentId,
            completed: status === "REVIEWED",
          },
          update: { completed: status === "REVIEWED" },
        });
        return true;
      });
      if (!reviewCreated)
        return {
          success: "검토 내용에 변경이 없어 새 기록은 만들지 않았습니다.",
        };
      target = `/teacher/assignments/${submission.assignmentId}`;
    } else if (op === "attachment-delete") {
      if (user.role !== "TEACHER") throw Error();
      const id = text(50).parse(form.get("id"));
      const result = await db.attachment.deleteMany({
        where: { id, assignment: { class: { teacherId: user.id } } },
      });
      if (result.count !== 1) throw Error();
    } else if (op === "progress") {
      if (user.role !== "STUDENT") throw Error();
      const id = text(50).parse(form.get("id"));
      if (!(await accessibleAssignment(id, user))) throw Error();
      const field = z.enum(["completed", "favorite"]).parse(form.get("field"));
      const value =
        z.enum(["true", "false"]).parse(form.get("value")) === "true";
      await db.$transaction(async (tx) => {
        const assignmentInfo = await tx.assignment.findUnique({
          where: { id },
          select: { classId: true },
        });
        if (!assignmentInfo) throw new ActionError("과제를 찾을 수 없습니다.");
        await tx.$queryRaw`
          SELECT "id" FROM "ClassMember"
          WHERE "classId" = ${assignmentInfo.classId}
            AND "userId" = ${user.id}
          FOR UPDATE
        `;
        await tx.$queryRaw`
          SELECT "id" FROM "Assignment" WHERE "id" = ${id}
          FOR UPDATE
        `;
        const activeAssignment = await tx.assignment.findFirst({
          where: {
            id,
            archivedAt: null,
            class: {
              members: { some: { userId: user.id, removedAt: null } },
            },
          },
          select: { id: true },
        });
        if (!activeAssignment)
          throw new ActionError("과제에 접근할 수 없습니다.");
        await tx.assignmentProgress.upsert({
          where: { userId_assignmentId: { userId: user.id, assignmentId: id } },
          create: { userId: user.id, assignmentId: id, [field]: value },
          update: { [field]: value },
        });
      });
      successMessage =
        field === "completed"
          ? value
            ? "진행 완료 표시를 저장했어요. 제출 상태는 별도로 표시됩니다."
            : "진행 상태를 진행 중으로 바꿨어요."
          : value
            ? "즐겨찾기에 추가했어요."
            : "즐겨찾기를 해제했어요.";
    } else if (op === "event") {
      if (user.role !== "STUDENT") throw Error();
      const data = z.object({ title: text(150), dueAt: due }).parse(raw);
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE
        `;
        const count = await tx.personalEvent.count({
          where: { userId: user.id },
        });
        if (count >= MAX_PERSONAL_EVENTS_PER_USER)
          throw new ActionError(
            `개인 일정은 최대 ${MAX_PERSONAL_EVENTS_PER_USER}개까지 저장할 수 있습니다.`,
          );
        await tx.personalEvent.create({ data: { ...data, userId: user.id } });
      });
    } else if (op === "event-delete") {
      if (user.role !== "STUDENT") throw Error();
      await db.personalEvent.deleteMany({
        where: { id: text(50).parse(form.get("id")), userId: user.id },
      });
    } else if (op === "event-update") {
      if (user.role !== "STUDENT") throw Error();
      const id = text(50).parse(form.get("id"));
      const data = z.object({ title: text(150), dueAt: due }).parse(raw);
      const updated = await db.personalEvent.updateMany({
        where: { id, userId: user.id },
        data,
      });
      if (updated.count !== 1)
        throw new ActionError("개인 일정을 찾을 수 없습니다.");
      target = "/student/calendar";
    } else throw Error();
    revalidatePath(`/${user.role.toLowerCase()}`, "layout");
  } catch (e) {
    const operationValue = form.get("op");
    if (operationValue === "assignment") {
      const readValue = (key: string, limit: number) => {
        const value = form.get(key);
        return typeof value === "string" ? value.slice(0, limit) : "";
      };
      const values = {
        title: readValue("title", 150),
        description: readValue("description", 10000),
        rubric: readValue("rubric", 5000),
        type: readValue("type", 20),
        dueAt: readValue("dueAt", 10),
      };
      const file = form.get("file");
      const fileSelected =
        file instanceof File && file.name.length > 0 && !isEmptyFileInput(file);
      return {
        error: `${message(e)}${fileSelected ? " 첨부파일은 다시 선택해 주세요." : ""}`,
        values,
      };
    }
    return { error: message(e) };
  }
  if (target) redirect(target);
  return { success: successMessage };
}
