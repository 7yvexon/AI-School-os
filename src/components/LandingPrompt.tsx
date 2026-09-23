"use client";

import { ArrowUpRight, MessageCircle, Search } from "lucide-react";
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
  }

  function submitPrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value) {
      setError("시작할 일을 한 문장으로 입력해 주세요.");
      return;
    }

    try {
      window.sessionStorage.setItem(PROMPT_DRAFT_KEY, value);
      window.sessionStorage.setItem(PROMPT_DRAFT_MODE_KEY, mode);
    } catch {
      setError(
        "입력 내용을 잠시 저장하지 못했어요. 로그인 후 다시 입력해 주세요.",
      );
      return;
    }

    router.push("/login");
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
          setPrompt(event.target.value);
          if (error) setError("");
        }}
        maxLength={240}
        rows={2}
        aria-describedby="landing-prompt-hint"
        aria-invalid={Boolean(error)}
        placeholder="예: 오늘 30분 동안 탐구 과제를 어디서부터 시작할까?"
      />
      <div
        className="deep-prompt__hint"
        id="landing-prompt-hint"
        aria-live="polite"
      >
        <span className={error ? "is-error" : undefined}>
          {error || "로그인 전에 입력한 문장은 이 브라우저에 잠시 보관해요."}
        </span>
        <small>{prompt.length}/240</small>
      </div>
      <div className="deep-prompt__bottom">
        <div className="deep-prompt__modes" aria-label="학습 모드">
          <button
            type="button"
            className={mode === "AI 학습" ? "is-active" : undefined}
            aria-pressed={mode === "AI 학습"}
            onClick={() => chooseMode("AI 학습")}
          >
            <MessageCircle size={14} aria-hidden="true" />
            AI 학습
          </button>
          <button
            type="button"
            className={mode === "과제 정리" ? "is-active" : undefined}
            aria-pressed={mode === "과제 정리"}
            onClick={() => chooseMode("과제 정리")}
          >
            <Search size={14} aria-hidden="true" />
            과제 정리
          </button>
        </div>
        <button
          type="submit"
          className="deep-prompt__send"
          aria-label={
            prompt.trim() ? "입력한 문장으로 로그인하기" : "AI 학습 시작하기"
          }
          title={
            prompt.trim() ? "입력한 문장으로 로그인하기" : "AI 학습 시작하기"
          }
        >
          <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
