"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "children" | "className" | "href"
> & {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function NavLink({ href, children, className, ...props }: NavLinkProps) {
  const path = usePathname() ?? "";
  const normalizedPath = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const normalizedHref = href.split(/[?#]/, 1)[0];
  const normalizedTarget =
    normalizedHref.length > 1
      ? normalizedHref.replace(/\/+$/, "")
      : normalizedHref;
  const active =
    normalizedPath === normalizedTarget ||
    (normalizedPath.startsWith(`${normalizedTarget}/`) &&
      !normalizedTarget.endsWith("/new"));
  const current = normalizedPath === normalizedTarget;
  return (
    <Link
      {...props}
      href={href}
      className={["nav-link", active ? "active" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
