"use client";
import { useActionState } from "react";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";
type FormAssignment = {
  id?: string;
  title?: string;
  description?: string;
  rubric?: string;
  type?: string;
  dueAt?: Date | string;
};
export function AssignmentForm({
  classId,
  assignment,
}: {
  classId: string;
  assignment?: FormAssignment;
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const date = assignment?.dueAt
    ? new Date(assignment.dueAt).toISOString().slice(0, 10)
    : "";
  return (
    <form
      action={action}
      className="card card-pad"
      encType="multipart/form-data"
    >
      <input type="hidden" name="op" value="assignment" />
      <input type="hidden" name="classId" value={classId} />
      {assignment?.id && (
        <input type="hidden" name="id" value={assignment.id} />
      )}
      <ActionMessage state={state} />
      <div className="form-grid">
        <div className="field field-full">
          <label htmlFor="title">제목</label>
          <input
            id="title"
            name="title"
            defaultValue={assignment?.title}
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
            defaultValue={assignment?.type || "HOMEWORK"}
          >
            <option value="HOMEWORK">과제</option>
            <option value="ASSESSMENT">수행평가</option>
            <option value="EXAM">시험</option>
            <option value="MATERIAL">준비물</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="dueAt">마감일</label>
          <input
            id="dueAt"
            name="dueAt"
            type="date"
            defaultValue={date}
            required
          />
        </div>
        <div className="field field-full">
          <label htmlFor="description">설명</label>
          <textarea
            id="description"
            name="description"
            defaultValue={assignment?.description}
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
            defaultValue={assignment?.rubric}
            maxLength={5000}
            placeholder="주제 선정\n자료 조사\n분석\n보고서 작성"
            style={{ minHeight: 100 }}
          />
        </div>
        <div className="field field-full">
          <label htmlFor="file">
            첨부파일{" "}
            <span className="form-hint">PDF, PNG, JPG, TXT · 5MB 이하</span>
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg,text/plain"
          />
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
