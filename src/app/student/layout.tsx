import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = {
  ...pageMetadata(
    "학생 공간",
    "학생 대시보드, 클래스, 과제와 일정을 관리하세요.",
  ),
  robots: { index: false, follow: false },
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("STUDENT");
  return (
    <AppShell
      role="STUDENT"
      user={{ name: user.name, email: user.email, plan: user.plan }}
      title="나의 학교생활"
    >
      <div className="content">{children}</div>
    </AppShell>
  );
}
