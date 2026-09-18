import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";
export function AppShell({
  role,
  user,
  children,
  title,
}: {
  role: "STUDENT" | "TEACHER";
  user: { name: string; email: string; plan: string };
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="app-shell">
      <Sidebar role={role} user={user} />
      <main id="main-content" className="main" tabIndex={-1}>
        <header className="topbar">
          <MobileNav role={role} />
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            <span className="badge badge-blue">
              {role === "STUDENT" ? "학생 공간" : "선생님 공간"}
            </span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
