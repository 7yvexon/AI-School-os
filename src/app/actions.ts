"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import {
  createSession,
  logoutSession,
  requireUser,
  validTeacherInvite,
} from "@/lib/auth";
import { ownedClass, accessibleAssignment } from "@/lib/access";
import { rateLimit, RateLimitError } from "@/lib/rate-limit";
import { hashIdentifier, requestIp } from "@/lib/request";
import { createClassCode } from "@/lib/class-code";
import { attachmentMimeMatchesData } from "@/lib/attachment";
import {
  MAX_ATTACHMENT_BYTES_PER_CLASS,
  MAX_ATTACHMENTS_PER_CLASS,
} from "@/lib/limits";
const text = (max: number) =>
  z.string().trim().min(1, "필수 항목을 입력해 주세요.").max(max);
const due = z.iso.date().transform((v) => new Date(`${v}T23:59:59+09:00`));
const reviewStatus = z.enum(["RETURNED", "REVIEWED"]);
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
      return await db.class.create({
        data: {
          ...data,
          code: createClassCode(),
        },
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
function message(e: unknown, duplicateEmail = false) {
  return duplicateEmail && isUniqueConstraintError(e)
    ? "이미 가입된 이메일입니다. 로그인해 주세요."
    : e instanceof z.ZodError
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
        password: z
          .string()
          .min(10, "비밀번호는 10자 이상이어야 합니다.")
          .max(72)
          .refine(
            (v) => Buffer.byteLength(v, "utf8") <= 72,
            "비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.",
          ),
      })
      .parse(Object.fromEntries(form));
    const ip = requestIp(await headers());
    await rateLimit(`auth:ip:${hashIdentifier(ip)}`, 30, 15 * 60000);
    if (mode === "register")
      await rateLimit(`register:ip:${hashIdentifier(ip)}`, 5, 60 * 60000);
    let user;
    if (mode === "register") {
      const profile = z
        .object({ name: text(40), role: z.enum(["STUDENT", "TEACHER"]) })
        .parse(Object.fromEntries(form));
      if (profile.role === "TEACHER") {
        const invite = z
          .string()
          .trim()
          .min(1, "교사 초대 코드를 입력해 주세요.")
          .max(200)
          .parse(form.get("teacherInviteCode"));
        if (!validTeacherInvite(invite))
          throw new ActionError("교사 가입은 유효한 초대 코드가 필요합니다.");
      }
      user = await db.user.create({
        data: {
          ...profile,
          email: data.email,
          passwordHash: await bcrypt.hash(data.password, 12),
          ...(profile.role === "TEACHER"
            ? { teacherApprovedAt: new Date() }
            : {}),
        },
      });
    } else {
      user = await db.user.findUnique({ where: { email: data.email } });
      const valid = await bcrypt.compare(
        data.password,
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
    await createSession(user.id);
    target = `/${user.role.toLowerCase()}/dashboard`;
  } catch (e) {
    return { error: message(e, mode === "register") };
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
  const op = String(form.get("op"));
  let target = "";
  try {
    const ip = requestIp(await headers());
    await rateLimit(`write:ip:${hashIdentifier(ip)}`, 200, 60000);
    await rateLimit(`write:${user.id}`, 100, 60000);
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
      const cls = await db.class.findUnique({ where: { code } });
      if (!cls) {
        await rateLimit(`join:code:${hashIdentifier(code)}`, 20, 60000);
        return { error: "클래스 코드를 확인해 주세요." };
      }
      const existingMember = await db.classMember.findUnique({
        where: { userId_classId: { userId: user.id, classId: cls.id } },
      });
      if (existingMember?.removedAt)
        return { error: "이 클래스에 다시 참여할 수 없습니다." };
      await db.classMember.upsert({
        where: { userId_classId: { userId: user.id, classId: cls.id } },
        create: { userId: user.id, classId: cls.id },
        update: {},
      });
      target = `/student/classes/${cls.id}`;
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
      const member = await db.classMember.findFirst({
        where: {
          id: memberId,
          removedAt: null,
          class: { teacherId: user.id },
        },
      });
      if (!member) throw Error();
      await db.classMember.update({
        where: { id: memberId },
        data: { removedAt: new Date() },
      });
    } else if (op === "member-restore") {
      if (user.role !== "TEACHER") throw Error();
      const memberId = text(50).parse(form.get("memberId"));
      const member = await db.classMember.findFirst({
        where: {
          id: memberId,
          removedAt: { not: null },
          class: { teacherId: user.id },
        },
      });
      if (!member) throw Error();
      await db.classMember.update({
        where: { id: memberId },
        data: { removedAt: null },
      });
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
      const id = String(form.get("id") || "");
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
      if (file instanceof File && file.size) {
        if (file.size > 5 * 1024 * 1024)
          return { error: "첨부파일은 5MB 이하여야 합니다." };
        if (
          ![
            "application/pdf",
            "image/png",
            "image/jpeg",
            "text/plain",
          ].includes(file.type)
        )
          return { error: "PDF, PNG, JPG, TXT 파일만 첨부할 수 있습니다." };
        const data = new Uint8Array(await file.arrayBuffer());
        const name = file.name.trim().slice(0, 200);
        if (!name) return { error: "첨부파일 이름을 확인해 주세요." };
        if (!attachmentMimeMatchesData(file.type, data))
          return { error: "파일 형식과 내용이 일치하지 않습니다." };
        attachment = {
          name,
          mime: file.type,
          size: data.byteLength,
          data,
        };
      }
      const assignment = await db.$transaction(async (tx) => {
        const a = id
          ? await tx.assignment.update({ where: { id }, data })
          : await tx.assignment.create({ data: { ...data, classId } });
        if (attachment) {
          await tx.$queryRaw`
            SELECT "id" FROM "Class" WHERE "id" = ${classId} FOR UPDATE
          `;
          const where = { assignment: { classId } };
          const count = await tx.attachment.count({ where });
          const total = await tx.attachment.aggregate({
            where,
            _sum: { size: true },
          });
          if (count >= MAX_ATTACHMENTS_PER_CLASS)
            throw new ActionError("클래스 첨부파일 개수 한도에 도달했습니다.");
          if (
            (total._sum.size ?? 0) + attachment.size >
            MAX_ATTACHMENT_BYTES_PER_CLASS
          )
            throw new ActionError(
              "클래스 첨부파일 총용량 한도에 도달했습니다.",
            );
          await tx.attachment.create({
            data: { ...attachment, assignmentId: a.id },
          });
        }
        return a;
      });
      target = `/teacher/assignments/${assignment.id}`;
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
      const a = await db.attachment.findFirst({
        where: { id, assignment: { class: { teacherId: user.id } } },
      });
      if (!a) throw Error();
      await db.attachment.delete({ where: { id } });
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
      await db.personalEvent.create({ data: { ...data, userId: user.id } });
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
  return { success: "저장했습니다." };
}
