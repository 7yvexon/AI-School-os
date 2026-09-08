"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { logout } from "@/app/actions";
export function MobileNav({ role }: { role: "STUDENT" | "TEACHER" }) {
  const [open, setOpen] = useState(false);
  const base = `/${role.toLowerCase()}`;
  return (
    <div className="mobile-menu">
      <button
        className="btn btn-ghost"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <nav className="mobile-nav" aria-label="모바일 메뉴">
          {[
            ["대시보드", "/dashboard"],
            ["내 클래스", "/classes"],
            ["과제", "/assignments"],
            ...(role === "STUDENT"
              ? [
                  ["캘린더", "/calendar"],
                  ["AI 도우미", "/ai"],
                ]
              : []),
            ["설정", "/settings"],
          ].map(([label, path]) => (
            <Link href={base + path} key={path} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <form action={logout}>
            <button className="btn btn-ghost" type="submit">
              로그아웃
            </button>
          </form>
        </nav>
      )}
    </div>
  );
}
