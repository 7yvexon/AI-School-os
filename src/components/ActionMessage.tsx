"use client";
import type { ActionState } from "@/app/actions";
export function ActionMessage({ state }: { state: ActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <div
      className={`alert ${state.error ? "alert-error" : "alert-success"}`}
      role={state.error ? "alert" : "status"}
      aria-live={state.error ? "assertive" : "polite"}
      aria-atomic="true"
      tabIndex={-1}
    >
      {state.error || state.success}
    </div>
  );
}
