"use client";
import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
export function ProfileForm({
  user,
}: {
  user: { name: string; school: string; grade: string; classroom: string };
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  return (
    <form action={action} className="card card-pad">
      <input type="hidden" name="op" value="profile" />
      <ActionMessage state={state} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">이름</label>
          <input
            id="name"
            name="name"
            defaultValue={user.name}
            required
            maxLength={40}
          />
        </div>
        <div className="field">
          <label htmlFor="school">학교</label>
          <input
            id="school"
            name="school"
            defaultValue={user.school}
            maxLength={100}
            placeholder="학교 이름"
          />
        </div>
        <div className="field">
          <label htmlFor="grade">학년</label>
          <input
            id="grade"
            name="grade"
            defaultValue={user.grade}
            maxLength={10}
            placeholder="2"
          />
        </div>
        <div className="field">
          <label htmlFor="classroom">반</label>
          <input
            id="classroom"
            name="classroom"
            defaultValue={user.classroom}
            maxLength={10}
            placeholder="3"
          />
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}
      >
        <SubmitButton>프로필 저장</SubmitButton>
      </div>
    </form>
  );
}
