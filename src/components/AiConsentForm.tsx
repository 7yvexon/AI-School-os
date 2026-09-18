"use client";

import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function AiConsentForm({ granted = false }: { granted?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <section className="card card-pad">
      <h2 className="small-heading">AI 사용 동의</h2>
      <p className="prose-like">
        AI에게 질문하면 과제 내용과 최근 대화, 학년 정보가 설정된 AI 제공자로
        전송됩니다. 이름·학교·반 정보는 전송하지 않습니다.
      </p>
      <ActionMessage state={state} />
      <form action={action}>
        <input
          type="hidden"
          name="op"
          value={granted ? "ai-consent-revoke" : "ai-consent"}
        />
        <SubmitButton
          className={granted ? "btn btn-secondary" : "btn btn-primary"}
        >
          {granted ? "AI 사용 동의 철회" : "AI 사용 동의하기"}
        </SubmitButton>
      </form>
    </section>
  );
}
