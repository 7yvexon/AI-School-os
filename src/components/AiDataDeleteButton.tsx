"use client";

import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function AiDataDeleteButton() {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            "AI 대화 기록을 모두 삭제할까요? 삭제 후 복구할 수 없습니다.",
          )
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="op" value="ai-conversations-delete" />
      <SubmitButton className="btn btn-danger">AI 대화 기록 삭제</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
