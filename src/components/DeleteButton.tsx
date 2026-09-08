"use client";
import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
export function DeleteButton({
  id,
  op = "delete",
  label = "과제 삭제",
}: {
  id: string;
  op?: "delete" | "attachment-delete" | "event-delete";
  label?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(`${label}하시겠습니까? 삭제 후 복구할 수 없습니다.`)
        )
          event.preventDefault();
      }}
    >
      <input type="hidden" name="op" value={op} />
      <input type="hidden" name="id" value={id} />
      <SubmitButton className="btn btn-danger">{label}</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
