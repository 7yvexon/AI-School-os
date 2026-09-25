import { ClassDetail } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "클래스 관리",
  "초대 코드, 학생과 클래스 과제를 관리하세요.",
);
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClassDetail role="TEACHER" id={id} />;
}
