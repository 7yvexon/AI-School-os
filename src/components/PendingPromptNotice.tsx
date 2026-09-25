"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Copy, X } from "lucide-react";
import {
  PROMPT_DRAFT_KEY,
  PROMPT_DRAFT_MODE_KEY,
  getPromptDraft,
  getPromptModeDraft,
  subscribePromptDraft,
} from "@/lib/prompt-draft";

export function PendingPromptNotice({
  role,
  hasAssignments,
  hasClasses,
  assignmentHref,
}: {
  role: "STUDENT" | "TEACHER";
  hasAssignments: boolean;
  hasClasses: boolean;
  assignmentHref?: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState("");
  const storedPrompt = useSyncExternalStore(
    subscribePromptDraft,
    getPromptDraft,
    () => "",
  );
  const mode = useSyncExternalStore(
    subscribePromptDraft,
    getPromptModeDraft,
    () => "AI 학습",
  );
  const prompt = dismissed ? "" : storedPrompt;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setMessage("시작 문장을 복사했어요.");
    } catch {
      setMessage("복사할 수 없어요. 문장을 직접 선택해 복사해 주세요.");
    }
  }

  function clearPrompt() {
    try {
      window.sessionStorage.removeItem(PROMPT_DRAFT_KEY);
      window.sessionStorage.removeItem(PROMPT_DRAFT_MODE_KEY);
    } catch {
      setMessage("입력 문장을 지우지 못했어요.");
      return;
    }
    setDismissed(true);
    setMessage("");
  }

  if (!prompt) return null;

  return (
    <section
      className="pending-prompt card card-pad"
      aria-labelledby="pending-prompt-title"
    >
      <div className="pending-prompt__body">
        <p className="pending-prompt__mode">{mode} 시작 문장</p>
        <h2 id="pending-prompt-title">입력한 문장을 이어서 사용해요</h2>
        <p className="pending-prompt__text">{prompt}</p>
        <p className="pending-prompt__hint">
          {role === "STUDENT"
            ? "이 문장은 현재 브라우저 탭에만 임시 저장됩니다. 로그인 또는 가입 후 클래스에 참여하고, AI 사용에 동의하면 과제 질문으로 이어 쓸 수 있어요."
            : "이 문장은 학생용 과제 AI 흐름에서 사용할 수 있어요. 필요하면 복사해 두거나 지워 주세요."}
        </p>
      </div>
      <div className="pending-prompt__actions">
        {role === "STUDENT" && (
          <Link
            className="btn btn-primary"
            href={
              hasAssignments && assignmentHref
                ? assignmentHref
                : hasClasses
                  ? "/student/assignments"
                  : "/student/classes"
            }
          >
            {hasAssignments
              ? "과제에서 이어 쓰기"
              : hasClasses
                ? "과제 목록 보기"
                : "클래스 참여하기"}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
        <button
          className="btn btn-secondary"
          type="button"
          onClick={copyPrompt}
        >
          <Copy size={14} aria-hidden="true" />
          문장 복사
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={clearPrompt}
        >
          <X size={14} aria-hidden="true" />
          지우기
        </button>
      </div>
      {message && (
        <p className="pending-prompt__status" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
