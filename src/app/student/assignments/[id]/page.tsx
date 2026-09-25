import { AssignmentDetail } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "과제 상세",
  "과제 설명, AI 도움, 제출과 피드백을 확인하세요.",
);
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssignmentDetail role="STUDENT" id={id} />;
}
