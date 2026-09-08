import { AssignmentDetail } from "@/components/WorkspaceViews";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssignmentDetail role="TEACHER" id={id} />;
}
