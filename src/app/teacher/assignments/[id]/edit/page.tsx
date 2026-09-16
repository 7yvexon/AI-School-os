import { notFound } from "next/navigation";
import { AssignmentForm } from "@/components/AssignmentForm";
import { Heading } from "@/components/WorkspaceViews";
import { requireUser } from "@/lib/auth";
import { accessibleAssignment } from "@/lib/access";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("TEACHER");
  const { id } = await params;
  const a = await accessibleAssignment(id, user, { includeArchived: true });
  if (!a) notFound();
  return (
    <>
      <Heading
        title="과제 수정"
        description="변경된 내용은 학생 화면에도 반영됩니다."
      />
      <AssignmentForm
        classId={a.classId}
        assignment={{
          id: a.id,
          title: a.title,
          description: a.description,
          rubric: a.rubric,
          type: a.type,
          dueAt: a.dueAt,
        }}
      />
    </>
  );
}
