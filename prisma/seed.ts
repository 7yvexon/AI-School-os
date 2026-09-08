import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function seed() {
  if (process.env.NODE_ENV === "production")
    throw new Error("샘플 계정은 개발환경에서만 생성할 수 있습니다.");
  const passwordHash = await bcrypt.hash("SchoolDemo!2026", 12);
  const teacher = await db.user.upsert({
    where: { email: "teacher@example.com" },
    update: {},
    create: {
      email: "teacher@example.com",
      name: "김선생",
      role: "TEACHER",
      passwordHash,
      school: "미래고등학교",
    },
  });
  const student = await db.user.upsert({
    where: { email: "student@example.com" },
    update: {},
    create: {
      email: "student@example.com",
      name: "윤재",
      role: "STUDENT",
      passwordHash,
      school: "미래고등학교",
      grade: "2",
      classroom: "3",
    },
  });
  const cls = await db.class.upsert({
    where: { code: "BSS-7K29FA" },
    update: {},
    create: {
      code: "BSS-7K29FA",
      name: "정보과학 2학년",
      subject: "정보",
      teacherId: teacher.id,
    },
  });
  await db.classMember.upsert({
    where: { userId_classId: { userId: student.id, classId: cls.id } },
    update: {},
    create: { userId: student.id, classId: cls.id },
  });
  await db.assignment.upsert({
    where: { id: "demo-public-data" },
    update: {},
    create: {
      id: "demo-public-data",
      classId: cls.id,
      title: "공공데이터 시각화 수행평가",
      type: "ASSESSMENT",
      dueAt: new Date("2026-09-20T23:59:59+09:00"),
      description:
        "공공데이터를 활용하여 그래프를 제작하고 결과를 분석합니다. 관심 있는 주제를 선정하고, 데이터 출처와 시각화 결과를 포함한 보고서를 작성하세요.",
      rubric:
        "데이터 선정 (25점): 주제에 맞는 데이터와 출처 제시\n시각화 (25점): 적절한 그래프 선택과 정확한 표현\n분석 (25점): 결과에서 확인되는 특징과 한계 설명\n보고서 작성 (25점): 과정과 결론을 논리적으로 정리",
    },
  });
  console.log(
    "개발용 샘플 데이터 준비 완료. teacher@example.com / student@example.com · 비밀번호: SchoolDemo!2026",
  );
}
seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
