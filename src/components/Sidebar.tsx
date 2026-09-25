import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  ClipboardCheck,
  CalendarDays,
  MessageCircle,
  Settings,
  Plus,
  Users,
} from "lucide-react";
import { Logo } from "./Logo";
import { NavLink } from "./NavLink";
import { LogoutForm } from "./LogoutForm";

export function Sidebar({
  role,
  user,
}: {
  role: "STUDENT" | "TEACHER";
  user: { name: string; email: string; plan: string };
}) {
  const student = role === "STUDENT";
  const base = student ? "/student" : "/teacher";
  const links = student
    ? ([
        ["대시보드", `${base}/dashboard`, LayoutDashboard],
        ["내 클래스", `${base}/classes`, BookOpen],
        ["과제 모아보기", `${base}/assignments`, ClipboardList],
        ["캘린더", `${base}/calendar`, CalendarDays],
        ["AI 학습 도우미", `${base}/ai`, MessageCircle],
      ] as const)
    : ([
        ["대시보드", `${base}/dashboard`, LayoutDashboard],
        ["내 클래스", `${base}/classes`, BookOpen],
        ["과제 관리", `${base}/assignments`, ClipboardList],
        ["검토 대기", `${base}/reviews`, ClipboardCheck],
        ["학생 현황", `${base}/students`, Users],
      ] as const);
  return (
    <aside className="sidebar">
      <Logo href={`${base}/dashboard`} label="AI School OS 대시보드" />
      <nav aria-label="주요 메뉴">
        <div className="nav-section">Workspace</div>
        {links.map(([label, href, Icon]) => (
          <NavLink key={href} href={href}>
            <Icon size={17} aria-hidden="true" focusable="false" />
            <span>{label}</span>
          </NavLink>
        ))}
        {role === "TEACHER" && (
          <NavLink href="/teacher/classes/new">
            <Plus size={17} aria-hidden="true" focusable="false" />
            <span>새 클래스 만들기</span>
          </NavLink>
        )}
      </nav>
      <div className="sidebar-footer">
        <nav aria-label="계정 메뉴">
          <NavLink href={`${base}/settings`}>
            <Settings size={17} aria-hidden="true" focusable="false" />
            <span>설정</span>
          </NavLink>
          <LogoutForm className="nav-link nav-button" />
        </nav>
        <div className="profile-mini">
          <span className="avatar" aria-hidden="true">
            {user.name.slice(0, 1)}
          </span>
          <div>
            <p>{user.name}</p>
            <small>{user.plan === "PRO" ? "PRO 플랜" : user.email}</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
