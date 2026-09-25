import { Classes } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "내 클래스",
  "참여 중인 클래스와 수업 과제를 확인하세요.",
);
export default function Page() {
  return <Classes role="STUDENT" />;
}
