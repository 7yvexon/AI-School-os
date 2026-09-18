"use client";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/actions";
import { NavLink } from "./NavLink";

export function MobileNav({ role }: { role: "STUDENT" | "TEACHER" }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const nav = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);
  const base = `/${role.toLowerCase()}`;
  useEffect(() => {
    if (open && !wasOpen.current) {
      nav.current?.querySelector<HTMLElement>("a, button")?.focus();
    }
    if (!open && wasOpen.current) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
        onClick={() => setOpen(!open)}
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
                ["새 클래스 만들기", "/classes/new"],
              ]),
          ["설정", "/settings"],
        ].map(([label, path]) =>
          path === "/classes/new" ? (
            <Link
              className="nav-link"
              href={base + path}
              key={path}
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ) : (
            <NavLink
              href={base + path}
              key={path}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ),
        )}
        <form action={logout}>
          <button className="btn btn-ghost" type="submit">
            로그아웃
          </button>
        </form>
      </nav>
    </div>
  );
}
