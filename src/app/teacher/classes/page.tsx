import { Classes } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "운영 중인 클래스",
  "운영하는 클래스와 학생 현황을 관리하세요.",
);
export default function Page() {
  return <Classes role="TEACHER" />;
}
