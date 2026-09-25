import { Settings } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "교사 설정",
  "프로필과 수업 운영 정보를 관리하세요.",
);
export default function Page() {
  return <Settings role="TEACHER" />;
}
