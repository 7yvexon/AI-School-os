"use client";

import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function RotateClassCodeButton({ classId }: { classId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form action={action}>
      <input type="hidden" name="op" value="class-code-rotate" />
      <input type="hidden" name="classId" value={classId} />
      <SubmitButton className="btn btn-secondary">
        초대 코드 재발급
      </SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
