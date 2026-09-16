"use client";

import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function RemoveMemberButton({ memberId }: { memberId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("이 학생을 클래스에서 제외할까요?"))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="op" value="member-remove" />
      <input type="hidden" name="memberId" value={memberId} />
      <SubmitButton className="btn btn-danger">학생 제외</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
