import { notFound } from "next/navigation";
import { AssignmentForm } from "@/components/AssignmentForm";
import { Heading } from "@/components/WorkspaceViews";
import { requireUser } from "@/lib/auth";
import { ownedClass } from "@/lib/access";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "과제 등록",
  "클래스에 새 과제를 등록하세요.",
);
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("TEACHER");
  const { id } = await params;
  const cls = await ownedClass(id, user.id);
  if (!cls) notFound();
  return (
    <>
      <Heading
        title="새 과제 등록"
        description={`${cls.name}의 학생들에게 표시됩니다.`}
      />
      <AssignmentForm classId={id} />
    </>
  );
}
