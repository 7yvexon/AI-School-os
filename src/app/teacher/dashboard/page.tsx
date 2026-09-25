import { Dashboard } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "교사 대시보드",
  "클래스와 제출 검토 대기를 확인하세요.",
);
export default function Page() {
  return <Dashboard role="TEACHER" />;
}
