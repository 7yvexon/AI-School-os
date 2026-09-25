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
            "저장된 AI 대화를 모두 삭제할까요? 사용 동의와 사용량 통계는 유지됩니다. 진행 중인 질문은 외부 제공자에게 이미 전송됐을 수 있습니다. 삭제 후에는 복구할 수 없습니다.",
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
