import { ClassDetail } from "@/components/WorkspaceViews";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ClassDetail role="STUDENT" id={id} />;
}
