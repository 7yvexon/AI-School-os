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
      <div>
        <SubmitButton className="btn btn-secondary">참여 복원</SubmitButton>
        <p className="form-hint">
          복원하면 학생의 클래스 접근이 바로 다시 열립니다.
        </p>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
