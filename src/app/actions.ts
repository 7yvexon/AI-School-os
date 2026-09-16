"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSession, logoutSession, requireUser } from "@/lib/auth";
import { ownedClass, accessibleAssignment } from "@/lib/access";
import { rateLimit } from "@/lib/rate-limit";
const text = (max: number) =>
  z.string().trim().min(1, "필수 항목을 입력해 주세요.").max(max);
const due = z.iso.date().transform((v) => new Date(`${v}T23:59:59+09:00`));
const reviewStatus = z.enum(["RETURNED", "REVIEWED"]);
export type ActionState = { error?: string; success?: string };
function message(e: unknown) {
  return e instanceof z.ZodError
    ? e.issues[0].message
    : e instanceof Error && /요청이 너무/.test(e.message)
      ? e.message
      : "요청을 처리하지 못했습니다. 입력과 접근 권한을 확인해 주세요.";
}
export async function authenticate(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const mode = form.get("mode");
  let target = "";
  try {
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
    await rateLimit("auth:global", 300, 15 * 60000);
    await rateLimit(
      `auth:${createHash("sha256").update(data.email).digest("hex")}`,
      10,
      15 * 60000,
    );
    let user;
    if (mode === "register") {
      const profile = z
        .object({ name: text(40), role: z.enum(["STUDENT", "TEACHER"]) })
        .parse(Object.fromEntries(form));
      user = await db.user.create({
        data: {
          ...profile,
          email: data.email,
          passwordHash: await bcrypt.hash(data.password, 12),
        },
      });
    } else {
      user = await db.user.findUnique({ where: { email: data.email } });
      const valid = await bcrypt.compare(
        data.password,
        user?.passwordHash ??
          "$2b$12$C6UzMDM.H6dfI/f/IKcEe.5wZOkJ/KLCNNv9ABeDH9bOiSDDbpUei",
      );
      if (!user || !valid)
        return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
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
  const op = String(form.get("op"));
  let target = "";
  try {
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
      const cls = await db.class.findUnique({ where: { code } });
      if (!cls) return { error: "클래스 코드를 확인해 주세요." };
      await db.classMember.upsert({
        where: { userId_classId: { userId: user.id, classId: cls.id } },
        create: { userId: user.id, classId: cls.id },
        update: {},
      });
      target = `/student/classes/${cls.id}`;
    } else if (op === "class") {
      if (user.role !== "TEACHER") throw Error();
      const data = z.object({ name: text(80), subject: text(40) }).parse(raw);
      const cls = await db.class.create({
        data: {
          ...data,
          teacherId: user.id,
          code: `BSS-${randomBytes(5).toString("hex").toUpperCase()}`,
        },
      });
      target = `/teacher/classes/${cls.id}`;
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
        | { name: string; mime: string; data: Uint8Array<ArrayBuffer> }
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
        attachment = {
          name: file.name.slice(0, 200),
          mime: file.type,
          data: new Uint8Array(await file.arrayBuffer()),
        };
      }
      const assignment = await db.$transaction(async (tx) => {
        const a = id
          ? await tx.assignment.update({ where: { id }, data })
          : await tx.assignment.create({ data: { ...data, classId } });
        if (attachment)
          await tx.attachment.create({
            data: { ...attachment, assignmentId: a.id },
          });
        return a;
      });
      target = `/teacher/assignments/${assignment.id}`;
    } else if (op === "delete") {
      const id = text(50).parse(form.get("id"));
      const a = await accessibleAssignment(id, user);
      if (user.role !== "TEACHER" || !a) throw Error();
      await db.assignment.delete({ where: { id } });
      target = `/teacher/classes/${a.classId}`;
    } else if (op === "submission") {
      if (user.role !== "STUDENT") throw Error();
      const assignmentId = text(50).parse(form.get("assignmentId"));
      if (!(await accessibleAssignment(assignmentId, user))) throw Error();
      const content = text(20000).parse(form.get("content"));
      const existing = await db.submission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId: user.id,
          },
        },
      });
      if (existing?.status === "REVIEWED")
        return {
          error: "검토가 완료된 제출물은 수정할 수 없습니다. 반려된 뒤 다시 제출해 주세요.",
        };
      await db.$transaction(async (tx) => {
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
        await tx.submission.update({
          where: { id: submissionId },
          data: { status, feedback, reviewedAt: new Date() },
        });
        await tx.assignmentProgress.upsert({
          where: {
            userId_assignmentId: {
              userId: submission.studentId,
              assignmentId: submission.assignmentId,
            },
          },
          create: {
            userId: submission.studentId,
            assignmentId: submission.assignmentId,
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
      await db.assignmentProgress.upsert({
        where: { userId_assignmentId: { userId: user.id, assignmentId: id } },
        create: { userId: user.id, assignmentId: id, [field]: value },
        update: { [field]: value },
      });
    } else if (op === "event") {
      if (user.role !== "STUDENT") throw Error();
      const data = z.object({ title: text(150), dueAt: due }).parse(raw);
      await db.personalEvent.create({ data: { ...data, userId: user.id } });
    } else if (op === "event-delete") {
      await db.personalEvent.deleteMany({
        where: { id: text(50).parse(form.get("id")), userId: user.id },
      });
    } else throw Error();
    revalidatePath("/", "layout");
  } catch (e) {
    return { error: message(e) };
  }
  if (target) redirect(target);
  return { success: "저장했습니다." };
}
