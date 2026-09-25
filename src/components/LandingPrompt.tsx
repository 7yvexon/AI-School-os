"use client";

import { ArrowUpRight, Check, MessageCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  PROMPT_DRAFT_KEY,
  PROMPT_DRAFT_MODE_KEY,
  type PromptMode,
} from "@/lib/prompt-draft";

export function LandingPrompt() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<PromptMode>("AI 학습");
  const [error, setError] = useState("");

  function chooseMode(nextMode: PromptMode) {
    setMode(nextMode);
    setError("");
    persistDraft(prompt, nextMode);
  }

  function persistDraft(value: string, draftMode: PromptMode) {
    try {
      if (!value.trim()) {
        window.sessionStorage.removeItem(PROMPT_DRAFT_KEY);
        window.sessionStorage.removeItem(PROMPT_DRAFT_MODE_KEY);
        return true;
      }
      window.sessionStorage.setItem(PROMPT_DRAFT_KEY, value.trim());
      window.sessionStorage.setItem(PROMPT_DRAFT_MODE_KEY, draftMode);
      return true;
    } catch {
      return false;
    }
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!persistDraft(prompt, mode)) {
      setError("시작 문장을 저장하지 못했어요. 가입 후 다시 입력해 주세요.");
      return;
    }
    router.push("/register");
  }

  return (
    <form className="deep-prompt" id="prompt" onSubmit={submitPrompt}>
      <div className="deep-prompt__top">
        <span>
          <i aria-hidden="true" />
          AI School OS
        </span>
        <small>학생과 선생님을 위한 학습 공간</small>
      </div>
      <label className="sr-only" htmlFor="landing-prompt">
        AI에게 시작할 일 입력
      </label>
      <textarea
        id="landing-prompt"
        name="prompt"
        value={prompt}
        onChange={(event) => {
          const value = event.currentTarget.value;
          setPrompt(value);
          setError(
            persistDraft(value, mode)
              ? ""
              : "브라우저 저장을 사용할 수 없어 문장을 임시 보관하지 못했어요.",
          );
        }}
        maxLength={240}
        rows={2}
        aria-describedby="landing-prompt-hint"
        aria-invalid={Boolean(error)}
        placeholder="예: 오늘 30분 동안 탐구 과제를 어디서부터 시작할까?"
      />
      <div className="deep-prompt__hint" id="landing-prompt-hint">
        {error ? (
          <span className="is-error" role="status" aria-live="polite">
            {error}
          </span>
        ) : (
          <span>
            문장은 이 탭에 임시 저장돼요. 질문 전에는 AI로 전송되지 않습니다.
          </span>
        )}
        <small aria-live="off">{prompt.length}/240</small>
      </div>
      <div className="deep-prompt__bottom">
        <div className="deep-prompt__modes" aria-label="학습 모드">
          <button
            type="button"
            className={mode === "AI 학습" ? "is-active" : undefined}
            aria-pressed={mode === "AI 학습"}
            onClick={() => chooseMode("AI 학습")}
          >
            {mode === "AI 학습" && <Check size={13} aria-hidden="true" />}
            <MessageCircle size={14} aria-hidden="true" />
            AI 학습
          </button>
          <button
            type="button"
            className={mode === "과제 정리" ? "is-active" : undefined}
            aria-pressed={mode === "과제 정리"}
            onClick={() => chooseMode("과제 정리")}
          >
            {mode === "과제 정리" && <Check size={13} aria-hidden="true" />}
            <Search size={14} aria-hidden="true" />
            과제 정리
          </button>
        </div>
        <button
          type="submit"
          className="deep-prompt__send"
          aria-label={
            prompt.trim() ? "문장을 저장하고 가입하기" : "가입하고 시작하기"
          }
        >
          <span>
            {prompt.trim() ? "문장 저장하고 가입" : "가입하고 시작하기"}
          </span>
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
