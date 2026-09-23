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
  "event-delete",
]);
const attachmentMime = z.enum([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
]);
export type ActionState = { error?: string; success?: string };
class ActionError extends Error {}
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
      .extend(
        mode === "login"
          ? { password: passwordSchema }
          : {
              password: passwordSchema,
              phone: z
                .string()
                .trim()
                .min(3, "전화번호를 입력해 주세요.")
                .max(32, "전화번호를 확인해 주세요."),
            },
      )
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
      const phone = z
        .string()
        .trim()
        .min(3, "전화번호를 입력해 주세요.")
        .max(32, "전화번호를 확인해 주세요.")
        .parse(form.get("phone"));
      user = await db.user.create({
        data: {
          ...profile,
          email: data.email,
          phone,
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
            "교사 가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
        };
      throw new ActionError("교사 승인이 필요합니다.");
    }
    await createSession(user.id);
    target = `/${user.role.toLowerCase()}/dashboard`;
  } catch (e) {
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
      const code = text(20).parse(form.get("code")).toUpperCase();
      const ip = requestIp(await headers());
      await rateLimit(`join:ip:${hashIdentifier(ip)}`, 30, 60000);
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
        return { error: "이 클래스에 다시 참여할 수 없습니다." };
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
      await db.user.update({
        where: { id: user.id },
        data: { aiConsentAt: new Date() },
      });
    } else if (op === "ai-consent-revoke") {
      if (user.role !== "STUDENT") throw Error();
      await db.user.update({
        where: { id: user.id },
        data: { aiConsentAt: null },
      });
    } else if (op === "ai-conversations-delete") {
      if (user.role !== "STUDENT") throw Error();
      await db.aIConversation.deleteMany({ where: { userId: user.id } });
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
        return { error: "첨부파일을 확인해 주세요." };
      if (file instanceof File && file.size) {
        if (
          !Number.isSafeInteger(file.size) ||
          file.size > MAX_ATTACHMENT_BYTES
        )
          return { error: "첨부파일은 5MB 이하여야 합니다." };
        const mime = attachmentMime.safeParse(file.type);
        if (!mime.success)
          return { error: "PDF, PNG, JPG, TXT 파일만 첨부할 수 있습니다." };
        const data = new Uint8Array(await file.arrayBuffer());
        if (data.byteLength !== file.size || !attachmentDataSizeAllowed(data))
          return { error: "첨부파일은 5MB 이하여야 합니다." };
        const name = sanitizeAttachmentName(file.name);
        if (!name) return { error: "첨부파일 이름을 확인해 주세요." };
        if (!attachmentMimeMatchesData(mime.data, data))
          return { error: "파일 형식과 내용이 일치하지 않습니다." };
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
          return {
            error: "안전하지 않은 첨부파일로 판단되어 업로드할 수 없습니다.",
          };
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
        } else {
          target = `/teacher/assignments/${result.id}`;
        }
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
            "검토가 완료된 제출물은 수정할 수 없습니다. 반려된 뒤 다시 제출해 주세요.",
          );
        if (existing?.status === "SUBMITTED")
          throw new ActionError(
            "검토 중인 제출물은 수정할 수 없습니다. 선생님의 검토 결과를 기다려 주세요.",
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
        return { error: "반려할 때는 학생에게 전달할 의견을 입력해 주세요." };
      await db.$transaction(async (tx) => {
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
      });
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
    } else throw Error();
    revalidatePath(`/${user.role.toLowerCase()}`, "layout");
  } catch (e) {
    return { error: message(e) };
  }
  if (target) redirect(target);
  return { success: successMessage };
}
