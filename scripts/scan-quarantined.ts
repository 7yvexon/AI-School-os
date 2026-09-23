import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { scanAttachmentData } from "../src/lib/attachment-scanner";

const db = new PrismaClient();

async function main() {
  let clean = 0;
  let infected = 0;
  let pending = 0;
  let lastId = "";
  let examined = 0;
  while (examined < 1000) {
    const ids = await db.attachment.findMany({
      where: {
        id: { gt: lastId },
        scanStatus: { in: ["QUARANTINED", "SCAN_ERROR"] },
      },
      orderBy: { id: "asc" },
      take: Math.min(25, 1000 - examined),
      select: { id: true },
    });
    if (!ids.length) break;
    examined += ids.length;
    lastId = ids[ids.length - 1].id;
    for (const { id } of ids) {
      const file = await db.attachment.findFirst({
        where: {
          id,
          scanStatus: { in: ["QUARANTINED", "SCAN_ERROR"] },
        },
        select: { data: true },
      });
      if (!file) continue;
      const result = await scanAttachmentData(file.data);
      const scanStatus =
        result.status === "CLEAN"
          ? "CLEAN"
          : result.status === "INFECTED"
            ? "INFECTED"
            : result.status === "ERROR"
              ? "SCAN_ERROR"
              : "QUARANTINED";
      const updated = await db.attachment.updateMany({
        where: {
          id,
          scanStatus: { in: ["QUARANTINED", "SCAN_ERROR"] },
        },
        data: {
          scanStatus,
          scannedAt: result.status === "UNAVAILABLE" ? null : new Date(),
          scanEngine: result.engine,
        },
      });
      if (!updated.count) continue;
      if (scanStatus === "CLEAN") clean++;
      else if (scanStatus === "INFECTED") infected++;
      else pending++;
    }
  }
  console.log(
    `첨부파일 검사 완료: clean=${clean}, infected=${infected}, pending=${pending}`,
  );
}

main()
  .catch(() => {
    console.error("격리 첨부파일 검사에 실패했습니다.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
