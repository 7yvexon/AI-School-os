import { ClassDetail } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "클래스",
  "클래스의 과제와 수업 정보를 확인하세요.",
);
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClassDetail role="STUDENT" id={id} />;
}
