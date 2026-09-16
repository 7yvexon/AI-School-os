"use client";

import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function RestoreMemberButton({ memberId }: { memberId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form action={action}>
      <input type="hidden" name="op" value="member-restore" />
      <input type="hidden" name="memberId" value={memberId} />
      <SubmitButton className="btn btn-secondary">학생 다시 초대</SubmitButton>
      <ActionMessage state={state} />
    </form>
  );
}
