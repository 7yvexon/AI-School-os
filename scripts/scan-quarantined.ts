import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { scanAttachmentData } from "../src/lib/attachment-scanner";

const db = new PrismaClient();

async function main() {
  const files = await db.attachment.findMany({
    where: { scanStatus: { in: ["QUARANTINED", "SCAN_ERROR"] } },
    orderBy: { id: "asc" },
    take: 1000,
    select: { id: true, data: true },
  });
  let clean = 0;
  let infected = 0;
  let pending = 0;
  for (const file of files) {
    const result = await scanAttachmentData(file.data);
    const scanStatus =
      result.status === "CLEAN"
        ? "CLEAN"
        : result.status === "INFECTED"
          ? "INFECTED"
          : result.status === "ERROR"
            ? "SCAN_ERROR"
            : "QUARANTINED";
    await db.attachment.update({
      where: { id: file.id },
      data: {
        scanStatus,
        scannedAt: result.status === "UNAVAILABLE" ? null : new Date(),
        scanEngine: result.engine,
      },
    });
    if (scanStatus === "CLEAN") clean++;
    else if (scanStatus === "INFECTED") infected++;
    else pending++;
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
