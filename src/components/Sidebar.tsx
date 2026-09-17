import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CalendarDays,
  MessageCircle,
  Settings,
  LogOut,
  Plus,
  Users,
} from "lucide-react";
import { Logo } from "./Logo";
import { logout } from "@/app/actions";
import { NavLink } from "./NavLink";

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
        ["학생 현황", `${base}/students`, Users],
      ] as const);
  return (
    <aside className="sidebar" aria-label="주요 메뉴">
      <Logo href={`${base}/dashboard`} />
      <div className="nav-section">Workspace</div>
      {links.map(([label, href, Icon]) => (
        <NavLink key={href} href={href}>
          <Icon size={17} />
          <span>{label}</span>
        </NavLink>
      ))}
      {role === "TEACHER" && (
        <Link className="nav-link" href="/teacher/classes/new">
          <Plus size={17} />
          <span>새 클래스 만들기</span>
        </Link>
      )}
      <div className="sidebar-footer">
        <Link className="nav-link" href={`${base}/settings`}>
          <Settings size={17} />
          <span>설정</span>
        </Link>
        <form action={logout}>
          <button
            className="nav-link"
            type="submit"
            style={{ width: "100%", border: 0 }}
          >
            <LogOut size={17} />
            <span>로그아웃</span>
          </button>
        </form>
        <div className="profile-mini">
          <span className="avatar">{user.name.slice(0, 1)}</span>
          <div>
            <p>{user.name}</p>
            <small>{user.plan === "PRO" ? "PRO 플랜" : user.email}</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
