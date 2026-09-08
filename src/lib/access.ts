import { db } from "./db";
export async function accessibleAssignment(
  id: string,
  user: { id: string; role: string },
) {
  return db.assignment.findFirst({
    where: {
      id,
      class:
        user.role === "TEACHER"
          ? { teacherId: user.id }
          : { members: { some: { userId: user.id } } },
    },
    include: { class: true, attachments: { select: { id: true, name: true } } },
  });
}
export async function ownedClass(id: string, userId: string) {
  return db.class.findFirst({ where: { id, teacherId: userId } });
}
