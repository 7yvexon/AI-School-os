"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useActionState, useSyncExternalStore } from "react";
import { authenticate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { Logo } from "./Logo";
import { SubmitButton } from "./SubmitButton";

const emptySubscription = () => () => {};
const getServerPrompt = () => "";
const getClientPrompt = () => {
  try {
    return window.sessionStorage.getItem("ai-school-prompt") ?? "";
  } catch {
    return "";
  }
};
const getClientPromptMode = () => {
  try {
    return window.sessionStorage.getItem("ai-school-prompt-mode") ===
      "과제 정리"
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
                  <strong>기본 정보</strong>
                  <small>나를 위한 계정을 만들어요.</small>
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
                  <strong>학습 시작</strong>
                  <small>오늘 할 일을 한 화면에서 확인해요.</small>
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

          {pendingPrompt && (
            <div className="study-auth-intent" role="status">
              <span>방금 입력한 시작 문장</span>
              <p>{pendingPrompt}</p>
              <small>
                로그인 후 {pendingPromptMode} 흐름에서 다시 붙여넣어 시작할 수
                있어요.
              </small>
            </div>
          )}

          <form action={action} className="study-auth-form">
            <input type="hidden" name="mode" value={mode} />
            <ActionMessage state={state} />

            {register && (
              <div className="study-auth-field">
                <label htmlFor="name">이름</label>
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
                <legend>계정 유형</legend>
                <div className="study-auth-role-grid">
                  <div className="study-auth-role-option">
                    <input
                      id="student"
                      aria-label="학생"
                      type="radio"
                      name="role"
                      value="STUDENT"
                      defaultChecked
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
                    />
                    <label htmlFor="teacher">
                      <strong>선생님</strong>
                      <small>수업과 학생 흐름 관리</small>
                    </label>
                  </div>
                </div>
              </fieldset>
            )}

            <div className="study-auth-field">
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                placeholder="you@school.com"
              />
            </div>

            {register && (
              <div className="study-auth-field">
                <label htmlFor="phone">전화번호</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  maxLength={32}
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="010-1234-5678"
                />
              </div>
            )}

            <div className="study-auth-field">
              <label htmlFor="password">비밀번호</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={72}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="10자 이상"
              />
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
        </section>
      </div>
    </main>
  );
}
