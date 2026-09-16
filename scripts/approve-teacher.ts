import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const db = new PrismaClient();

async function main() {
  const email = z.email().parse(process.argv[2]).toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.role !== "TEACHER")
    throw new Error("승인할 교사 계정을 찾을 수 없습니다.");
  await db.user.update({
    where: { id: user.id },
    data: { teacherApprovedAt: new Date() },
  });
  console.log(`${email}: 교사 승인 완료`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
