"use client";
import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
export function EventForm() {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form action={action} className="card card-pad">
      <input type="hidden" name="op" value="event" />
      <ActionMessage state={state} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="title">일정</label>
          <input
            id="title"
            name="title"
            required
            maxLength={150}
            placeholder="동아리 모임"
          />
        </div>
        <div className="field">
          <label htmlFor="dueAt">날짜</label>
          <input id="dueAt" name="dueAt" type="date" required />
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 17 }}
      >
        <SubmitButton>일정 추가</SubmitButton>
      </div>
    </form>
  );
}
