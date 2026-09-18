"use client";
import { useActionState } from "react";
import { Check, Star } from "lucide-react";
import { mutate, type ActionState } from "@/app/actions";
export function ProgressButton({
  id,
  field,
  value,
  label,
}: {
  id: string;
  field: "completed" | "favorite";
  value: boolean;
  label?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    mutate,
    {},
  );
  const accessibleLabel =
    label ??
    (field === "completed"
      ? value
        ? "완료됨 · 취소하기"
        : "완료 처리"
      : value
        ? "즐겨찾기 해제"
        : "즐겨찾기");
  return (
    <form action={action}>
      <input type="hidden" name="op" value="progress" />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="field" value={field} />
      <input type="hidden" name="value" value={String(!value)} />
      <button
        className={
          field === "completed" ? "btn btn-secondary" : "btn btn-ghost"
        }
        title={accessibleLabel}
        aria-label={accessibleLabel}
        aria-pressed={value}
        aria-busy={pending}
        disabled={pending}
        type="submit"
      >
        {field === "completed" ? (
          <>
            <Check
              size={15}
              color={value ? "#0f9f6e" : undefined}
              aria-hidden="true"
            />
            {label || (value ? "완료됨 · 취소하기" : "완료 처리")}
          </>
        ) : (
          <Star
            size={18}
            fill={value ? "#eab308" : "none"}
            color={value ? "#eab308" : "#7b8494"}
            aria-hidden="true"
          />
        )}
      </button>
      {state.error && (
        <span
          className="form-hint"
          style={{ color: "var(--red)" }}
          role="alert"
        >
          {state.error}
        </span>
      )}
    </form>
  );
}
