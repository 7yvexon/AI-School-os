"use client";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingText = "저장 중...",
  ariaLabel,
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (!pending && restoreFocus.current) {
      restoreFocus.current = false;
      button.current?.focus();
    }
  }, [pending]);
  return (
    <button
      ref={button}
      className={className}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      aria-label={ariaLabel}
      onClick={() => {
        restoreFocus.current = document.activeElement === button.current;
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
