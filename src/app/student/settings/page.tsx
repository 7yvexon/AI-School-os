import { Settings } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "학생 설정",
  "프로필, AI 동의와 사용량을 관리하세요.",
);
export default function Page() {
  return <Settings role="STUDENT" />;
}
