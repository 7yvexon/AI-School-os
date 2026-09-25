"use client";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "./NavLink";
import { LogoutForm } from "./LogoutForm";

export function MobileNav({ role }: { role: "STUDENT" | "TEACHER" }) {
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null);
  const pathname = usePathname();
  const open = openedAtPath === pathname;
  const trigger = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const closeReason = useRef<"toggle" | "escape" | "navigation">("toggle");
  const previousPathname = useRef(pathname);
  const base = `/${role.toLowerCase()}`;
  useEffect(() => {
    const pathChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (open && !wasOpen.current) {
      nav.current?.querySelector<HTMLElement>("a, button")?.focus();
    }
    if (!open && wasOpen.current) {
      if (pathChanged || closeReason.current === "navigation")
        document.getElementById("main-content")?.focus();
      else trigger.current?.focus();
    }
    if (pathChanged && !wasOpen.current)
      document.getElementById("main-content")?.focus();
    wasOpen.current = open;
  }, [open, pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeReason.current = "escape";
        setOpenedAtPath(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return (
    <div className="mobile-menu">
      <button
        ref={trigger}
        className="btn btn-ghost"
        type="button"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => {
          closeReason.current = "toggle";
          setOpenedAtPath(open ? null : pathname);
        }}
      >
        {open ? (
          <X size={20} aria-hidden="true" focusable="false" />
        ) : (
          <Menu size={20} aria-hidden="true" focusable="false" />
        )}
      </button>
      <nav
        className="mobile-nav"
        id="mobile-navigation"
        aria-label="모바일 메뉴"
        ref={nav}
        hidden={!open}
      >
        {[
          ["대시보드", "/dashboard"],
          ["내 클래스", "/classes"],
          ["과제", "/assignments"],
          ...(role === "STUDENT"
            ? [
                ["캘린더", "/calendar"],
                ["AI 도우미", "/ai"],
              ]
            : [
                ["학생 현황", "/students"],
                ["검토 대기", "/reviews"],
                ["새 클래스 만들기", "/classes/new"],
              ]),
          ["설정", "/settings"],
        ].map(([label, path]) => (
          <NavLink
            href={base + path}
            key={path}
            onClick={() => {
              closeReason.current = "navigation";
              setOpenedAtPath(null);
            }}
          >
            {label}
          </NavLink>
        ))}
        <LogoutForm className="btn btn-ghost" />
      </nav>
    </div>
  );
}
