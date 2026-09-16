"use client";

import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function RestoreButton({ id }: { id: string }) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form action={action}>
      <input type="hidden" name="op" value="assignment-restore" />
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn btn-primary">과제 복원</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
