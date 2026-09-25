export const PROMPT_DRAFT_KEY = "ai-school-prompt";
export const PROMPT_DRAFT_MODE_KEY = "ai-school-prompt-mode";

export type PromptMode = "AI 학습" | "과제 정리";

export const subscribePromptDraft = () => () => {};

export const getPromptDraft = () => {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(PROMPT_DRAFT_KEY) ?? "";
  } catch {
    return "";
  }
};

export const getPromptModeDraft = (): PromptMode => {
  if (typeof window === "undefined") return "AI 학습";
  try {
    return window.sessionStorage.getItem(PROMPT_DRAFT_MODE_KEY) === "과제 정리"
      ? "과제 정리"
      : "AI 학습";
  } catch {
    return "AI 학습";
  }
};

export const clearPromptDraft = () => {
  try {
    window.sessionStorage.removeItem(PROMPT_DRAFT_KEY);
    window.sessionStorage.removeItem(PROMPT_DRAFT_MODE_KEY);
    return true;
  } catch {
    return false;
  }
};
