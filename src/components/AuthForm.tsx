"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action] = useActionState<ActionState, FormData>(
    authenticate,
    {},
  );
  const register = mode === "register";
  return (
    <div className="auth-shell">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="brand">
            <span className="brand-mark">A</span>
            <span>AI School OS</span>
          </div>
          <h1>{register ? "계정 만들기" : "다시 만나서 반가워요"}</h1>
          <p>
            {register
              ? "학생과 선생님을 위한 학습 업무 공간"
              : "계정에 로그인해 오늘의 할 일을 확인하세요"}
          </p>
        </div>
        <form action={action} className="auth-form">
          <input type="hidden" name="mode" value={mode} />
          <ActionMessage state={state} />
          {register && (
            <div className="field">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                name="name"
                required
                maxLength={40}
                placeholder="홍길동"
              />
            </div>
          )}{" "}
          {register && (
            <div className="field">
              <label>계정 유형</label>
              <div className="radio-row">
                <div className="radio-option">
                  <input
                    id="student"
                    type="radio"
                    name="role"
                    value="STUDENT"
                    defaultChecked
                  />
                  <label htmlFor="student">학생</label>
                </div>
                <div className="radio-option">
                  <input
                    id="teacher"
                    type="radio"
                    name="role"
                    value="TEACHER"
                  />
                  <label htmlFor="teacher">선생님</label>
                </div>
              </div>
            </div>
          )}
          <div className="field">
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
          <div className="field">
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
            {register && (
              <span className="form-hint">
                개발용 계정도 안전하게 10자 이상을 사용해 주세요.
              </span>
            )}
          </div>
          <SubmitButton className="btn btn-primary btn-block">
            {register ? "회원가입" : "로그인"}
          </SubmitButton>
        </form>
        <p className="auth-footer">
          {register ? "이미 계정이 있나요? " : "처음 사용하시나요? "}
          <Link href={register ? "/login" : "/register"}>
            {register ? "로그인" : "회원가입"}
          </Link>
        </p>
      </div>
    </div>
  );
}
