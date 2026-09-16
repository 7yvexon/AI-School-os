import "server-only";
import { db } from "./db";
export async function accessibleAssignment(
  id: string,
  user: { id: string; role: string },
  options: { includeArchived?: boolean } = {},
) {
  return db.assignment.findFirst({
    where: {
      id,
      ...(options.includeArchived ? {} : { archivedAt: null }),
      class:
        user.role === "TEACHER"
          ? { teacherId: user.id }
          : { members: { some: { userId: user.id, removedAt: null } } },
    },
    include: { class: true, attachments: { select: { id: true, name: true } } },
  });
}
export async function ownedClass(id: string, userId: string) {
  return db.class.findFirst({ where: { id, teacherId: userId } });
}
