"use client";

import Link from "next/link";
import { ArrowRight, Copy, Eye, EyeOff, X } from "lucide-react";
import { useActionState, useState, useSyncExternalStore } from "react";
import { authenticate, type ActionState } from "@/app/actions";
import {
  clearPromptDraft,
  PROMPT_DRAFT_KEY,
  PROMPT_DRAFT_MODE_KEY,
} from "@/lib/prompt-draft";
import { ActionMessage } from "./ActionMessage";
import { Logo } from "./Logo";
import { SubmitButton } from "./SubmitButton";

const emptySubscription = () => () => {};
const getServerPrompt = () => "";
const getClientPrompt = () => {
  try {
    return window.sessionStorage.getItem(PROMPT_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
};
const getClientPromptMode = () => {
  try {
    return window.sessionStorage.getItem(PROMPT_DRAFT_MODE_KEY) === "과제 정리"
      ? "과제 정리"
      : "AI 학습";
  } catch {
    return "AI 학습";
  }
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action] = useActionState<ActionState, FormData>(
    authenticate,
    {},
  );
  const [selectedRole, setSelectedRole] = useState<"STUDENT" | "TEACHER">(
    "STUDENT",
  );
  const [copyMessage, setCopyMessage] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [promptHidden, setPromptHidden] = useState(false);
  const register = mode === "register";
  const pendingPrompt = useSyncExternalStore(
    emptySubscription,
    getClientPrompt,
    getServerPrompt,
  );
  const pendingPromptMode = useSyncExternalStore(
    emptySubscription,
    getClientPromptMode,
    () => "AI 학습",
  );

  async function copyPendingPrompt() {
    try {
      await navigator.clipboard.writeText(pendingPrompt);
      setCopyMessage("시작 문장을 복사했어요.");
    } catch {
      setCopyMessage("복사할 수 없어요. 문장을 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <main
      id="main-content"
      className={
        register
          ? "study-auth-page deep-auth-page deep-auth-page--register"
          : "study-auth-page deep-auth-page deep-auth-page--login"
      }
    >
      <div className="study-auth-ambient" aria-hidden="true">
        <span />
        <span />
      </div>
      <header className="study-auth-header">
        <Logo />
        <span>AI SCHOOL OS / ACCOUNT</span>
        <Link href="/">홈으로 돌아가기</Link>
      </header>

      <div className="study-auth-shell">
        <section className="study-auth-story">
          <p className="study-auth-eyebrow">
            {register ? "START YOUR SCHOOL FLOW" : "WELCOME BACK"}
          </p>
          <h1>
            {register ? (
              <>
                처음 한 번의 설정으로,
                <br />
                학교생활이 달라집니다.
              </>
            ) : (
              <>
                멈춘 곳에서,
                <br />
                공부를 이어가세요.
              </>
            )}
          </h1>
          <p className="study-auth-story-copy">
            {register
              ? "과제와 일정, 제출과 피드백을 한곳에 모아 나만의 학교생활 공간을 시작해 보세요."
              : "오늘의 과제와 수업 흐름을 확인하고, 지금 할 수 있는 작은 일부터 시작해 보세요."}
          </p>

          {register ? (
            <ol className="study-auth-steps">
              <li className="is-active">
                <span>01</span>
                <div>
                  <strong>계정 만들기</strong>
                  <small>이름, 이메일과 비밀번호를 입력해요.</small>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>계정 유형</strong>
                  <small>학생 또는 선생님 공간을 선택해요.</small>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>클래스 연결</strong>
                  <small>학생은 초대 코드로 클래스에 참여해요.</small>
                </div>
              </li>
            </ol>
          ) : (
            <div className="study-auth-activity">
              <div className="study-auth-activity-top">
                <span>
                  <i />
                  TODAY&apos;S FLOW
                </span>
                <small>오늘</small>
              </div>
              <strong>
                오늘 할 일 중
                <br />
                무엇부터 시작하면 좋을까?
              </strong>
              <div className="study-auth-activity-line">
                <span />
                <p>과제 정리</p>
                <small>먼저</small>
              </div>
              <div className="study-auth-activity-line">
                <span />
                <p>수업 준비</p>
                <small>이어가기</small>
              </div>
            </div>
          )}
        </section>

        <section className="study-auth-card card">
          <div className="study-auth-card-status">
            <span>
              <i />
              SECURE ACCESS
            </span>
            <small>AI School OS</small>
          </div>
          <div className="study-auth-card-header">
            <p className="study-auth-eyebrow">
              {register ? "CREATE ACCOUNT" : "SIGN IN"}
            </p>
            <h2>
              {register
                ? "내 학교생활을 위한 계정을 만들어요."
                : "다시 만나서 반가워요."}
            </h2>
            <p>
              {register
                ? "학생과 선생님을 위한 학습 업무 공간"
                : "계정에 로그인해 오늘의 할 일을 확인하세요"}
            </p>
          </div>

          {pendingPrompt && !promptHidden && (
            <div className="study-auth-intent">
              <span>방금 입력한 시작 문장</span>
              <p>{pendingPrompt}</p>
              <small>
                학생은 클래스 참여와 AI 사용 동의 후 과제에서 이어 쓸 수
                있습니다.
              </small>
              <div className="study-auth-intent-actions">
                <span className="badge badge-blue">{pendingPromptMode}</span>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={copyPendingPrompt}
                >
                  <Copy size={14} aria-hidden="true" />
                  문장 복사
                </button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    if (!clearPromptDraft()) {
                      setCopyMessage("임시 문장을 지우지 못했습니다.");
                      return;
                    }
                    setPromptHidden(true);
                    setCopyMessage("");
                  }}
                >
                  <X size={14} aria-hidden="true" />
                  지우기
                </button>
              </div>
              {copyMessage && (
                <small className="study-auth-copy-status" role="status">
                  {copyMessage}
                </small>
              )}
            </div>
          )}

          <form action={action} className="study-auth-form">
            <input type="hidden" name="mode" value={mode} />
            <ActionMessage state={state} />

            {register && (
              <div className="study-auth-field">
                <label htmlFor="name">
                  이름{" "}
                  <span className="required-marker" aria-hidden="true">
                    (필수)
                  </span>
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={40}
                  autoComplete="name"
                  placeholder="홍길동"
                />
              </div>
            )}

            {register && (
              <fieldset className="study-auth-role-field">
                <legend>계정 유형 (필수)</legend>
                <div className="study-auth-role-grid">
                  <div className="study-auth-role-option">
                    <input
                      id="student"
                      aria-label="학생"
                      type="radio"
                      name="role"
                      value="STUDENT"
                      defaultChecked
                      onChange={() => setSelectedRole("STUDENT")}
                    />
                    <label htmlFor="student">
                      <strong>학생</strong>
                      <small>나의 과제와 일정 관리</small>
                    </label>
                  </div>
                  <div className="study-auth-role-option">
                    <input
                      id="teacher"
                      aria-label="선생님"
                      type="radio"
                      name="role"
                      value="TEACHER"
                      onChange={() => setSelectedRole("TEACHER")}
                    />
                    <label htmlFor="teacher">
                      <strong>선생님</strong>
                      <small>수업과 학생 흐름 관리</small>
                    </label>
                  </div>
                </div>
              </fieldset>
            )}

            {register && selectedRole === "TEACHER" && (
              <p className="study-auth-hint" aria-live="polite">
                선생님 계정은 운영 담당자의 승인 후 로그인할 수 있어요.
              </p>
            )}

            <div className="study-auth-field">
              <label htmlFor="email">이메일 (필수)</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                aria-describedby={register ? "email-hint" : undefined}
                placeholder="you@school.com"
              />
              {register && (
                <small className="study-auth-hint" id="email-hint">
                  이 시연 계정은 이메일 소유 여부를 확인하지 않습니다. 실제
                  학생·교직원 이메일을 입력하지 마세요.
                </small>
              )}
            </div>

            <div className="study-auth-field">
              <label htmlFor="password">비밀번호 (필수)</label>
              <div className="study-password-control">
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? "text" : "password"}
                  required
                  minLength={10}
                  maxLength={72}
                  autoComplete={register ? "new-password" : "current-password"}
                  aria-describedby={register ? "password-hint" : undefined}
                  placeholder="10자 이상"
                />
                <button
                  className="study-password-toggle"
                  type="button"
                  aria-label={
                    passwordVisible ? "비밀번호 숨기기" : "비밀번호 표시"
                  }
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
              {register && (
                <small className="study-auth-hint" id="password-hint">
                  10자 이상, UTF-8 기준 72바이트 이하로 입력해 주세요.
                </small>
              )}
              {!register && (
                <small className="study-auth-hint study-auth-recovery">
                  비밀번호를 잊으셨나요? 현재 직접 재설정은 제공하지 않습니다.
                  계정 복구가 필요하면 담당 선생님이나 서비스 관리자에게 문의해
                  주세요.
                </small>
              )}
            </div>

            <SubmitButton
              className="study-auth-submit btn btn-primary"
              pendingText={register ? "계정을 만드는 중..." : "로그인 중..."}
            >
              <span>{register ? "회원가입" : "로그인"}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </SubmitButton>
          </form>

          <p className="study-auth-footer">
            {register ? "이미 계정이 있나요? " : "처음 사용하시나요? "}
            <Link href={register ? "/login" : "/register"}>
              {register ? "로그인" : "회원가입"}
            </Link>
          </p>
          {register && (
            <p className="study-auth-privacy">
              가입 전에 <Link href="/privacy">개인정보 안내</Link>를 확인해
              주세요. 이 시연 서비스는 이메일 소유 여부를 확인하지 않습니다.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
