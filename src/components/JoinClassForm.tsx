"use client";
import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
export function JoinClassForm() {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form action={action} className="card card-pad">
      <input type="hidden" name="op" value="join" />
      <ActionMessage state={state} />
      <div className="field">
        <label htmlFor="code">클래스 코드</label>
        <input
          id="code"
          name="code"
          required
          maxLength={20}
          placeholder="BSS-7K29FA"
          style={{ textTransform: "uppercase", letterSpacing: ".08em" }}
        />
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 17 }}
      >
        <SubmitButton>클래스 참여</SubmitButton>
      </div>
    </form>
  );
}
