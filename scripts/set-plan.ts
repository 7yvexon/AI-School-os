import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
const db = new PrismaClient();
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("이 도구는 개발환경에서만 사용할 수 있습니다.");
  const email = z.email().parse(process.argv[2]).toLowerCase();
  const plan = z.enum(["FREE", "PRO"]).parse(process.argv[3]);
  await db.user.update({ where: { email }, data: { plan } });
  console.log(`${email}: ${plan} 변경 완료`);
}
main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
