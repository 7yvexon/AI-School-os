import { ClassForm } from "@/components/ClassForm";
import { Heading } from "@/components/WorkspaceViews";
import { requireUser } from "@/lib/auth";
import { pageMetadata } from "@/lib/page-metadata";
export const metadata = pageMetadata(
  "새 클래스 만들기",
  "학생을 초대할 클래스를 만드세요.",
);
export default async function Page() {
  await requireUser("TEACHER");
  return (
    <>
      <Heading
        title="새 클래스 만들기"
        description="클래스를 만들면 학생 초대 코드가 자동으로 생성됩니다."
      />
      <ClassForm />
    </>
  );
}
