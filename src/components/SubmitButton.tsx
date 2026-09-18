"use client";
import { useFormStatus } from "react-dom";
export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText = "저장 중...",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingText : children}
    </button>
  );
}
