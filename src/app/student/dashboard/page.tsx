import { Dashboard } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "학생 대시보드",
  "오늘의 과제, 마감과 개인 일정을 확인하세요.",
);
export default function Page() {
  return <Dashboard role="STUDENT" />;
}
