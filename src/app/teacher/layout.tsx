import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
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
