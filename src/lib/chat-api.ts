export type ChatApiMessage = {
  id: string;
  role: string;
  content: string;
};

export type ChatApiResponse = {
  message: ChatApiMessage;
  used: number;
  limit: number;
};

export class ChatApiError extends Error {
  constructor(
    message: string,
    readonly used?: number,
    readonly limit?: number,
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fallbackMessage(status: number) {
  if (status === 401) return "로그인이 만료되었어요. 다시 로그인해 주세요.";
  if (status === 403) return "이 질문을 보낼 권한이 없어요.";
  if (status === 429) return "잠시 후 다시 질문해 주세요.";
  if (status >= 500 && status <= 599)
    return "AI 서비스가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.";
  return "답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function isValidMessage(value: unknown): value is ChatApiMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.role === "string" &&
    typeof value.content === "string" &&
    value.content.trim().length > 0
  );
}

function isValidCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export async function readChatResponse(
  response: Response,
): Promise<ChatApiResponse> {
  let body: string;
  try {
    body = await response.text();
  } catch {
    throw new Error("네트워크 연결을 확인해 주세요.");
  }

  let data: unknown;
  try {
    data = body.trim() ? JSON.parse(body) : undefined;
  } catch {
    throw new Error(fallbackMessage(response.status));
  }

  if (!response.ok) {
    if (isRecord(data) && typeof data.error === "string" && data.error.trim())
      throw new ChatApiError(
        data.error,
        isValidCount(data.used) ? data.used : undefined,
        isValidCount(data.limit) ? data.limit : undefined,
      );
    throw new ChatApiError(fallbackMessage(response.status));
  }

  if (
    !isRecord(data) ||
    !isValidMessage(data.message) ||
    !isValidCount(data.used) ||
    !isValidCount(data.limit)
  )
    throw new Error("답변 형식을 확인해 주세요.");

  return {
    message: data.message,
    used: data.used,
    limit: data.limit,
  };
}
