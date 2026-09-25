"use client";

import { useActionState, useState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

type ReviewStatus = "SUBMITTED" | "RETURNED" | "REVIEWED";
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

export function SubmissionReviewForm({
  submissionId,
  studentName,
  studentMeta,
  content,
  status,
  feedback,
  submittedAt,
  updatedAt,
  reviews = [],
}: {
  submissionId: string;
  studentName: string;
  studentMeta: string;
  content: string;
  status: ReviewStatus;
  feedback: string;
  submittedAt: string;
  updatedAt: string;
  reviews?: ReviewRecord[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const [reviewStatus, setReviewStatus] = useState<
    "" | "RETURNED" | "REVIEWED"
  >(
    status === "RETURNED"
      ? "RETURNED"
      : status === "REVIEWED"
        ? "REVIEWED"
        : "",
  );
  const statusLabel =
    status === "REVIEWED"
      ? "검토 완료"
      : status === "RETURNED"
        ? "수정 요청"
        : "검토 대기";

  return (
    <article className="list-item" style={{ alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <h3>{studentName}</h3>
          <span
            className={`badge ${status === "REVIEWED" ? "badge-green" : status === "RETURNED" ? "badge-red" : "badge-blue"}`}
          >
            {statusLabel}
          </span>
        </div>
        <p>{studentMeta || "학년·반 정보 없음"}</p>
        <p className="form-hint">제출 {formatSeoul(submittedAt)}</p>
        <div
          className="prose-like"
          style={{ whiteSpace: "pre-wrap", marginTop: 12 }}
        >
          {content}
        </div>
        {reviews.length > 0 && (
          <details style={{ marginTop: 16 }}>
            <summary>검토 기록 {reviews.length}개</summary>
            <div style={{ marginTop: 10 }}>
              {reviews.map((review) => (
                <div className="list-item" key={review.id}>
                  <div>
                    <strong>
                      {review.status === "REVIEWED" ? "검토 완료" : "수정 요청"}
                    </strong>
                    <p className="form-hint">
                      {review.reviewerName} · {formatSeoul(review.createdAt)}
                    </p>
                    {review.feedback && (
                      <p className="prose-like">{review.feedback}</p>
                    )}
                    {review.submissionContent ? (
                      <details>
                        <summary>검토 당시 제출 내용</summary>
                        <p className="prose-like submission-snapshot">
                          {review.submissionContent}
                        </p>
                      </details>
                    ) : (
                      <p className="form-hint">
                        이 기록에는 검토 당시 제출 내용이 저장되지 않았습니다.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
        <form action={action} style={{ marginTop: 16 }}>
          <input type="hidden" name="op" value="submission-review" />
          <input type="hidden" name="submissionId" value={submissionId} />
          <input type="hidden" name="updatedAt" value={updatedAt} />
          <div className="form-grid">
            <div className="field">
              <label htmlFor={`review-status-${submissionId}`}>검토 결과</label>
              <select
                id={`review-status-${submissionId}`}
                name="status"
                value={reviewStatus}
                required
                onChange={(event) =>
                  setReviewStatus(
                    event.currentTarget.value as "" | "RETURNED" | "REVIEWED",
                  )
                }
              >
                <option value="" disabled>
                  검토 결과를 선택하세요
                </option>
                <option value="REVIEWED">검토 완료</option>
                <option value="RETURNED">수정 요청</option>
              </select>
            </div>
            <div className="field field-full">
              <label htmlFor={`review-feedback-${submissionId}`}>피드백</label>
              <textarea
                id={`review-feedback-${submissionId}`}
                name="feedback"
                defaultValue={feedback}
                maxLength={5000}
                required={reviewStatus === "RETURNED"}
                aria-required={reviewStatus === "RETURNED"}
                aria-describedby={`review-feedback-hint-${submissionId}`}
                placeholder="학생이 다음 단계로 나아갈 수 있는 의견을 남겨 주세요."
                style={{ minHeight: 100 }}
              />
              <span
                id={`review-feedback-hint-${submissionId}`}
                className="form-hint"
              >
                {reviewStatus === "RETURNED"
                  ? "수정 요청을 선택하면 피드백이 필요합니다."
                  : "선택 사항"}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 12,
            }}
          >
            <SubmitButton
              pendingText="저장 중..."
              ariaLabel={`${studentName} 제출물 검토 저장`}
            >
              검토 저장
            </SubmitButton>
          </div>
          <ActionMessage state={state} />
        </form>
      </div>
    </article>
  );
}
