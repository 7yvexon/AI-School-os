import { PrismaClient } from "@prisma/client";

type CountRow = { count: bigint };

const db = new PrismaClient();

const checks: Array<{ name: string; query: Promise<CountRow[]> }> = [
  {
    name: "중복 정규화 이메일",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM (
        SELECT lower(btrim("email"))
        FROM "User"
        GROUP BY lower(btrim("email"))
        HAVING count(*) > 1
      ) conflicts
    `,
  },
  {
    name: "정규화되지 않았거나 길이가 잘못된 이메일",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "User"
      WHERE "email" <> lower(btrim("email"))
        OR char_length("email") NOT BETWEEN 3 AND 254
    `,
  },
  {
    name: "역할과 승인·동의 시각이 일치하지 않는 사용자",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "User"
      WHERE ("role" <> 'TEACHER' AND "teacherApprovedAt" IS NOT NULL)
         OR ("role" <> 'STUDENT' AND "aiConsentAt" IS NOT NULL)
    `,
  },
  {
    name: "가입 시각보다 이른 멤버십 제외 시각",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "ClassMember"
      WHERE "removedAt" IS NOT NULL AND "removedAt" < "joinedAt"
    `,
  },
  {
    name: "생성 시각보다 이른 과제 보관 시각",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "Assignment"
      WHERE "archivedAt" IS NOT NULL AND "archivedAt" < "createdAt"
    `,
  },
  {
    name: "제출 상태·검토 시각·반려 의견 불일치",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "Submission"
      WHERE ("status" = 'SUBMITTED' AND "reviewedAt" IS NOT NULL)
         OR ("status" IN ('RETURNED', 'REVIEWED') AND "reviewedAt" IS NULL)
         OR ("status" = 'RETURNED' AND char_length(btrim("feedback")) = 0)
    `,
  },
  {
    name: "유효하지 않은 AI 사용량 날짜",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "AIUsage"
      WHERE "day" !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
         OR (
           "day" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
           AND to_char(to_date("day", 'YYYY-MM-DD'), 'YYYY-MM-DD') <> "day"
         )
    `,
  },
  {
    name: "제약에 맞지 않는 첨부파일",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "Attachment"
      WHERE "size" IS NULL
         OR "size" NOT BETWEEN 1 AND 5242880
         OR "size" <> octet_length("data")
         OR char_length(btrim("name")) NOT BETWEEN 1 AND 200
         OR "mime" NOT IN ('application/pdf', 'image/png', 'image/jpeg', 'text/plain')
    `,
  },
  {
    name: "허용되지 않은 AI 메시지 역할",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "AIMessage"
      WHERE "role" NOT IN ('user', 'assistant')
    `,
  },
  {
    name: "허용되지 않은 제출 검토 상태",
    query: db.$queryRaw<CountRow[]>`
      SELECT count(*)::bigint AS count
      FROM "SubmissionReview"
      WHERE "status" NOT IN ('RETURNED', 'REVIEWED')
    `,
  },
];

async function main() {
  await db.$connect();
  let failed = false;
  for (const check of checks) {
    const [row] = await check.query;
    const count = Number(row?.count ?? 0);
    if (count > 0) {
      failed = true;
      console.error(`FAIL ${check.name}: ${count}건`);
    } else {
      console.log(`OK ${check.name}`);
    }
  }
  if (failed) {
    console.error("migration을 적용하기 전에 위 데이터를 정리해야 합니다.");
    process.exitCode = 1;
  } else {
    console.log("migration 사전 점검을 통과했습니다.");
  }
}

main()
  .catch(() => {
    console.error("migration 사전 점검 데이터베이스 연결에 실패했습니다.");
    process.exitCode = 2;
  })
  .finally(() => db.$disconnect());
