import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { redirect } from "next/navigation";
import { getRuntimeConfig } from "./env";
const cookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-school_session"
    : "school_session";
function hash(token: string) {
  return createHmac("sha256", getRuntimeConfig().authSecret)
    .update(token)
    .digest("hex");
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.session.create({ data: { id: hash(token), userId, expiresAt } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export const getUser = cache(async function getUser() {
  const token = (await cookies()).get(cookieName)?.value;
  getRuntimeConfig();
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hash(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          school: true,
          grade: true,
          classroom: true,
          teacherApprovedAt: true,
          aiConsentAt: true,
        },
      },
    },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
});
export async function requireUser(role?: "STUDENT" | "TEACHER") {
  const user = await getUser();
  if (!user) redirect("/login");
  if (role && user.role !== role)
    redirect(`/${user.role.toLowerCase()}/dashboard`);
  if (user.role === "TEACHER" && !user.teacherApprovedAt) redirect("/login");
  return user;
}

export function teacherSignupEnabled() {
  return Boolean(process.env.TEACHER_INVITE_CODE?.trim());
}

export function validTeacherInvite(code: string) {
  const expected = process.env.TEACHER_INVITE_CODE;
  if (!expected) return false;
  const provided = Buffer.from(code);
  const target = Buffer.from(expected.trim());
  return provided.length === target.length && timingSafeEqual(provided, target);
}
export async function logoutSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  (await cookies()).delete(cookieName);
}
