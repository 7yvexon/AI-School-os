"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const active =
    path === href || (path.startsWith(href + "/") && !href.endsWith("/new"));
  return (
    <Link
      className={`nav-link${active ? " active" : ""}`}
      href={href}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
