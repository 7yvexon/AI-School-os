"use client";

import { logout } from "@/app/actions";
import { clearPromptDraft } from "@/lib/prompt-draft";

export function LogoutForm({ className }: { className: string }) {
  return (
    <form action={logout} onSubmit={clearPromptDraft}>
      <button className={className} type="submit">
        로그아웃
      </button>
    </form>
  );
}
