"use client";

import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

type SubmissionState = "SUBMITTED" | "RETURNED" | "REVIEWED";

export function SubmissionForm({
  assignmentId,
  content,
  status,
  feedback,
}: {
  assignmentId: string;
  content?: string;
  status?: SubmissionState;
  feedback?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const locked = status === "SUBMITTED" || status === "REVIEWED";
  const statusLabel =
    status === "REVIEWED"
      ? "검토 완료"
      : status === "RETURNED"
        ? "수정 후 재제출"
        : status === "SUBMITTED"
          ? "검토 대기"
          : "아직 제출하지 않음";

  return (
    <section className="card card-pad" id="submission">
      <div className="section-heading" style={{ marginTop: 0 }}>
        <div>
          <h2>과제 제출</h2>
          <p>
            {status === "RETURNED"
              ? "선생님 의견을 반영해 내용을 고친 뒤 다시 제출하세요."
              : "작성한 내용을 제출하면 선생님이 검토할 수 있어요."}
          </p>
        </div>
        <span
          className={`badge ${status === "REVIEWED" ? "badge-green" : status === "RETURNED" ? "badge-red" : "badge-blue"}`}
        >
          {statusLabel}
        </span>
      </div>
      <ActionMessage state={state} />
      <form action={action}>
        <input type="hidden" name="op" value="submission" />
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <div className="field field-full">
          <label htmlFor="submission-content">제출 내용</label>
          <textarea
            id="submission-content"
            name="content"
            defaultValue={content}
            required
            maxLength={20000}
            readOnly={locked}
            placeholder="과제를 수행한 과정과 결과를 작성해 주세요."
            style={{ minHeight: 180 }}
          />
          <span className="form-hint">최대 20,000자</span>
        </div>
        {!locked && (
          <div
            style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}
          >
            <SubmitButton>
              {status === "RETURNED" ? "다시 제출하기" : "과제 제출하기"}
            </SubmitButton>
          </div>
        )}
      </form>
      {feedback && (
        <div className="card card-pad" style={{ marginTop: 16 }}>
          <h3 className="small-heading">선생님 피드백</h3>
          <p className="prose-like">{feedback}</p>
        </div>
      )}
    </section>
  );
}
