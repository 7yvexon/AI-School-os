"use client";
import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
export function EventForm({
  event,
}: {
  event?: { id: string; title: string; dueAt: string };
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const suffix = event?.id ?? "new";
  return (
    <form
      action={action}
      className={event ? "event-edit-form" : "card card-pad"}
    >
      <input type="hidden" name="op" value={event ? "event-update" : "event"} />
      {event && <input type="hidden" name="id" value={event.id} />}
      <ActionMessage state={state} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`event-title-${suffix}`}>일정 (필수)</label>
          <input
            id={`event-title-${suffix}`}
            name="title"
            defaultValue={event?.title}
            required
            maxLength={150}
            placeholder="동아리 모임"
          />
        </div>
        <div className="field">
          <label htmlFor={`event-date-${suffix}`}>날짜 (필수)</label>
          <input
            id={`event-date-${suffix}`}
            name="dueAt"
            type="date"
            defaultValue={event?.dueAt}
            required
          />
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 17 }}
      >
        <SubmitButton>{event ? "일정 저장" : "일정 추가"}</SubmitButton>
      </div>
    </form>
  );
}
