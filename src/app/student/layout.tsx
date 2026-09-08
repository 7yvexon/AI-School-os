import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
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
      <div id="main-content" className="content">
        {children}
      </div>
    </AppShell>
  );
}
