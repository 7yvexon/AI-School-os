import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = {
  ...pageMetadata("선생님 공간", "클래스, 학생, 과제와 제출물을 관리하세요."),
  robots: { index: false, follow: false },
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("TEACHER");
  return (
    <AppShell
      role="TEACHER"
      user={{ name: user.name, email: user.email, plan: user.plan }}
      title="수업 관리"
    >
      <div className="content">{children}</div>
    </AppShell>
  );
}
