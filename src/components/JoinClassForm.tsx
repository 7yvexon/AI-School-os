"use client";
import { useActionState, useState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
export function JoinClassForm() {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const [code, setCode] = useState("");
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
          maxLength={21}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="BSS-42FCED1F04A17C3E"
          value={code}
          onChange={(event) => setCode(event.currentTarget.value.toUpperCase())}
          style={{ textTransform: "uppercase", letterSpacing: ".08em" }}
        />
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 17 }}
      >
        <SubmitButton pendingText="참여 중...">클래스 참여</SubmitButton>
      </div>
    </form>
  );
}
