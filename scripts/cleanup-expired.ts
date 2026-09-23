import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { cleanupExpiredRecords } from "../src/lib/database-maintenance";

const db = new PrismaClient();
cleanupExpiredRecords(db)
  .then(({ sessions, rateLimits, uploadReservations }) => {
    console.log(
      `만료 세션 ${sessions}개, 만료 요청 제한 ${rateLimits}개, 만료 첨부 예약 ${uploadReservations}개 정리 완료.`,
    );
  })
  .catch(() => {
    // Database connection errors can include connection details; keep CLI output minimal.
    console.error(
      "만료 데이터 정리에 실패했습니다. 데이터베이스 연결을 확인하세요.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
