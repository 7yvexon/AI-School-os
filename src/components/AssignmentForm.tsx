"use client";
import { useActionState, useEffect, useRef } from "react";
import { mutate, type ActionState } from "@/app/actions";
import Link from "next/link";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
type FormAssignment = {
  id?: string;
  title?: string;
  description?: string;
  rubric?: string;
  type?: string;
  dueAt?: Date | string;
  attachments?: { id: string; name: string; scanStatus: string }[];
};
export function AssignmentForm({
  classId,
  assignment,
}: {
  classId: string;
  assignment?: FormAssignment & {
    attachments?: { id: string; name: string; scanStatus: string }[];
  };
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error && state.values)
      form.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
  }, [state.error, state.values]);
  const dueAt = state.values?.dueAt ?? assignment?.dueAt;
  const date = dueAt
    ? typeof dueAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueAt)
      ? dueAt
      : new Date(dueAt).toISOString().slice(0, 10)
    : "";
  return (
    <form
      ref={form}
      action={action}
      className="card card-pad"
      key={JSON.stringify(state.values ?? null)}
    >
      <input type="hidden" name="op" value="assignment" />
      <input type="hidden" name="classId" value={classId} />
      {assignment?.id && (
        <input type="hidden" name="id" value={assignment.id} />
      )}
      <ActionMessage state={state} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="title">제목 (필수)</label>
          <input
            id="title"
            name="title"
            defaultValue={state.values?.title ?? assignment?.title}
            required
            maxLength={150}
            placeholder="예: 주제 탐구 보고서"
          />
        </div>
        <div className="field">
          <label htmlFor="type">종류</label>
          <select
            id="type"
            name="type"
            defaultValue={state.values?.type ?? assignment?.type ?? "HOMEWORK"}
          >
            <option value="HOMEWORK">과제</option>
            <option value="ASSESSMENT">수행평가</option>
            <option value="EXAM">시험</option>
            <option value="MATERIAL">준비물</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dueAt">마감일 (필수)</label>
          <input
            id="dueAt"
            name="dueAt"
            type="date"
            defaultValue={date}
            required
          />
        </div>
        <div className="field field-full">
          <label htmlFor="description">설명 (필수)</label>
          <textarea
            id="description"
            name="description"
            defaultValue={state.values?.description ?? assignment?.description}
            required
            maxLength={10000}
            placeholder="학생들이 해야 할 일을 쉽게 설명해 주세요."
          />
        </div>
        <div className="field field-full">
          <label htmlFor="rubric">
            평가기준 <span className="form-hint">(선택)</span>
          </label>
          <textarea
            id="rubric"
            name="rubric"
            defaultValue={state.values?.rubric ?? assignment?.rubric}
            maxLength={5000}
            placeholder="주제 선정\n자료 조사\n분석\n보고서 작성"
            style={{ minHeight: 100 }}
          />
        </div>
        <div className="field field-full">
          <label htmlFor="file">첨부파일</label>
          <span id="assignment-file-hint" className="form-hint">
            선택 사항 · PDF, PNG, JPG, TXT · 5MB 이하. 새 파일은 기존 첨부에
            추가됩니다.
          </span>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,text/plain"
            aria-describedby="assignment-file-hint"
          />
          {assignment?.attachments?.length ? (
            <ul className="assignment-attachments-current">
              {assignment.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <span>{attachment.name}</span>
                  <span className="form-hint">
                    {attachment.scanStatus === "CLEAN"
                      ? "검사 완료"
                      : attachment.scanStatus === "SCAN_ERROR"
                        ? "검사 오류 · 다운로드 차단"
                        : "검사 대기 · 다운로드 차단"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {assignment?.id && assignment.attachments?.length ? (
            <Link
              className="text-link"
              href={`/teacher/assignments/${assignment.id}#attachments`}
            >
              기존 첨부파일 관리
            </Link>
          ) : null}
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}
      >
        <SubmitButton>저장하기</SubmitButton>
      </div>
    </form>
  );
}
