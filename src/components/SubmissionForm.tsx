"use client";

import { useActionState, useState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

type SubmissionState = "SUBMITTED" | "RETURNED" | "REVIEWED";
type ReviewRecord = {
  id: string;
  status: "RETURNED" | "REVIEWED";
  feedback: string;
  submissionContent: string | null;
  createdAt: string;
  reviewerName: string;
};

const formatSeoul = (value: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));

export function SubmissionForm({
  assignmentId,
  content,
  status,
  feedback,
  reviews = [],
}: {
  assignmentId: string;
  content?: string;
  status?: SubmissionState;
  feedback?: string;
  reviews?: ReviewRecord[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const [draft, setDraft] = useState(content ?? "");
  const locked = status === "SUBMITTED" || status === "REVIEWED";
  const statusLabel =
    status === "REVIEWED"
      ? "검토 완료"
      : status === "RETURNED"
        ? "수정 요청"
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
              ? "선생님 의견을 확인하고 내용을 고친 뒤 다시 제출하세요."
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
      {status === "RETURNED" && feedback && (
        <div className="submission-current-feedback" role="status">
          <h3 className="small-heading">선생님 수정 요청</h3>
          <p className="prose-like">{feedback}</p>
        </div>
      )}
      <form action={action}>
        <input type="hidden" name="op" value="submission" />
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <div className="field field-full">
          <label htmlFor="submission-content">
            제출 내용 {!locked && "(필수)"}
          </label>
          <textarea
            id="submission-content"
            name="content"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            required={!locked}
            maxLength={20000}
            readOnly={locked}
            aria-describedby="submission-content-hint"
            placeholder="과제를 수행한 과정과 결과를 작성해 주세요."
            style={{ minHeight: 180 }}
          />
          <span id="submission-content-hint" className="form-hint">
            {draft.length.toLocaleString("ko-KR")} / 20,000자
          </span>
        </div>
        {!locked && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <SubmitButton>
              {status === "RETURNED" ? "다시 제출하기" : "과제 제출하기"}
            </SubmitButton>
          </div>
        )}
      </form>
      {status === "REVIEWED" && (
        <div className="submission-current-feedback" role="status">
          <h3 className="small-heading">선생님 피드백</h3>
          <p className="prose-like">
            {feedback || "검토가 완료되었습니다. 추가 의견은 없습니다."}
          </p>
        </div>
      )}
      {reviews.length > 0 && (
        <details className="submission-review-history">
          <summary>이전 검토 의견 {reviews.length}개 보기</summary>
          {reviews.map((review) => (
            <article
              className="submission-review-history__item"
              key={review.id}
            >
              <h3>
                {review.status === "RETURNED" ? "수정 요청" : "검토 완료"}
              </h3>
              <p className="form-hint">
                {review.reviewerName} · {formatSeoul(review.createdAt)}
              </p>
              {review.feedback && (
                <p className="prose-like">{review.feedback}</p>
              )}
              {review.submissionContent ? (
                <details>
                  <summary>검토 당시 제출 내용 보기</summary>
                  <p className="prose-like submission-snapshot">
                    {review.submissionContent}
                  </p>
                </details>
              ) : (
                <p className="form-hint">
                  이 기록은 제출 버전 저장 기능 도입 전 작성되었습니다.
                </p>
              )}
            </article>
          ))}
        </details>
      )}
    </section>
  );
}
