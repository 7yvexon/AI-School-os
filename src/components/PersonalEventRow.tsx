"use client";

import { useState } from "react";
import { DeleteButton } from "./DeleteButton";
import { EventForm } from "./EventForm";

export function PersonalEventRow({
  event,
}: {
  event: { id: string; title: string; dueAt: string };
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="personal-event-row">
      <div className="list-item">
        <div>
          <h3>{event.title}</h3>
          <p>{event.dueAt}</p>
        </div>
        <div className="detail-actions">
          <button
            className="btn btn-secondary"
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "편집 취소" : "일정 수정"}
          </button>
          <DeleteButton id={event.id} op="event-delete" label="일정 삭제" />
        </div>
      </div>
      {editing && <EventForm event={event} />}
    </div>
  );
}
