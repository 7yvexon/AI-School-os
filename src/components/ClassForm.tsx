"use client";
import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
export function ClassForm() {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form action={action} className="card card-pad">
      <input type="hidden" name="op" value="class" />
      <ActionMessage state={state} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">클래스 이름</label>
          <input
            id="name"
            name="name"
            required
            maxLength={80}
            placeholder="정보과학 2학년"
          />
        </div>
        <div className="field">
          <label htmlFor="subject">과목</label>
          <input
            id="subject"
            name="subject"
            required
            maxLength={40}
            placeholder="정보"
          />
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}
      >
        <SubmitButton>클래스 생성</SubmitButton>
      </div>
    </form>
  );
}
