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
    update: {
      name: "선생님",
      school: "우리학교",
      teacherApprovedAt: new Date(),
    },
    create: {
      email: "teacher@example.com",
      name: "선생님",
      role: "TEACHER",
      passwordHash,
      school: "우리학교",
      teacherApprovedAt: new Date(),
    },
  });
  const student = await db.user.upsert({
    where: { email: "student@example.com" },
    update: {
      name: "학생",
      school: "우리학교",
      grade: "2",
      classroom: "3",
    },
    create: {
      email: "student@example.com",
      name: "학생",
      role: "STUDENT",
      passwordHash,
      school: "우리학교",
      grade: "2",
      classroom: "3",
    },
  });
  const cls = await db.class.upsert({
    where: { code: "BSS-7K29FA" },
    update: { name: "2학년 탐구 수업", subject: "탐구", teacherId: teacher.id },
    create: {
      code: "BSS-7K29FA",
      name: "2학년 탐구 수업",
      subject: "탐구",
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
    update: {
      classId: cls.id,
      title: "주제 탐구 보고서",
      type: "ASSESSMENT",
      dueAt: new Date("2026-09-20T23:59:59+09:00"),
      archivedAt: null,
      description:
        "관심 있는 주제를 정해 자료를 조사하고 결과를 분석합니다. 조사 과정과 참고 자료를 포함한 보고서를 작성하세요.",
      rubric:
        "주제 선정 (25점): 탐구할 질문과 범위가 분명한가\n자료 조사 (25점): 신뢰할 수 있는 자료와 출처를 제시했는가\n분석 (25점): 자료에서 확인되는 특징과 한계를 설명했는가\n보고서 작성 (25점): 과정과 결론을 논리적으로 정리했는가",
    },
    create: {
      id: "demo-public-data",
      classId: cls.id,
      title: "주제 탐구 보고서",
      type: "ASSESSMENT",
      dueAt: new Date("2026-09-20T23:59:59+09:00"),
      description:
        "관심 있는 주제를 정해 자료를 조사하고 결과를 분석합니다. 조사 과정과 참고 자료를 포함한 보고서를 작성하세요.",
      rubric:
        "주제 선정 (25점): 탐구할 질문과 범위가 분명한가\n자료 조사 (25점): 신뢰할 수 있는 자료와 출처를 제시했는가\n분석 (25점): 자료에서 확인되는 특징과 한계를 설명했는가\n보고서 작성 (25점): 과정과 결론을 논리적으로 정리했는가",
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
