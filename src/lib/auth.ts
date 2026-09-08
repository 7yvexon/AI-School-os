import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes } from "node:crypto";
import { db } from "./db";
import { redirect } from "next/navigation";
const cookieName = "school_session";
function hash(token: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("AUTH_SECRET must contain at least 32 characters");
  return createHmac("sha256", secret).update(token).digest("hex");
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
export async function getUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hash(token) },
    include: { user: true },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function requireUser(role?: "STUDENT" | "TEACHER") {
  const user = await getUser();
  if (!user) redirect("/login");
  if (role && user.role !== role)
    redirect(`/${user.role.toLowerCase()}/dashboard`);
  return user;
}
export async function logoutSession() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  (await cookies()).delete(cookieName);
}
