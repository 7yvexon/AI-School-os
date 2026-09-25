import { AssignmentDetail } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "과제 및 제출 검토",
  "학생 제출 상태와 검토 기록을 확인하세요.",
);
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssignmentDetail role="TEACHER" id={id} />;
}
