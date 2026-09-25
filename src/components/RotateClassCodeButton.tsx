"use client";

import { useActionState, useState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function RotateClassCodeButton({
  classId,
  code,
}: {
  classId: string;
  code: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const [copyMessage, setCopyMessage] = useState("");
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyMessage("초대 코드를 복사했어요.");
    } catch {
      setCopyMessage("코드를 직접 선택해 복사해 주세요.");
    }
  }
  return (
    <div className="invite-code-actions">
      <div className="invite-code-current">
        <code className="class-code">{code}</code>
        <button className="btn btn-secondary" type="button" onClick={copyCode}>
          코드 복사
        </button>
      </div>
      {copyMessage && (
        <p role="status" className="form-hint">
          {copyMessage}
        </p>
      )}
      <form
        action={action}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "기존 초대 코드는 즉시 무효화됩니다. 이미 참여한 학생은 남아 있지만, 새 학생에게 새 코드를 다시 전달해야 합니다. 코드를 재발급할까요?",
            )
          )
            event.preventDefault();
        }}
      >
        <input type="hidden" name="op" value="class-code-rotate" />
        <input type="hidden" name="classId" value={classId} />
        <SubmitButton className="btn btn-secondary">
          초대 코드 재발급
        </SubmitButton>
        <ActionMessage state={state} />
      </form>
    </div>
  );
}
