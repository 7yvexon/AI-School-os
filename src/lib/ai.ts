import "server-only";
import { z } from "zod";
import {
  AI_REQUEST_TIMEOUT_MS,
  MAX_AI_MESSAGE_CHARS,
  MAX_AI_PROMPT_CHARS,
  MAX_AI_RESPONSE_BYTES,
  MAX_AI_RESPONSE_CHARS,
  MAX_AI_USAGE_TOKENS,
} from "./limits";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z
    .string()
    .max(MAX_AI_MESSAGE_CHARS)
    .refine((value) => value.trim().length > 0),
});

const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z
            .string()
            .max(MAX_AI_RESPONSE_CHARS)
            .refine((value) => value.trim().length > 0),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      total_tokens: z.number().int().nonnegative().max(MAX_AI_USAGE_TOKENS),
    })
    .optional(),
});

function aiBaseUrl() {
  const base = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  if (!base || !apiKey || !model || /[\r\n]/.test(apiKey)) return null;
  try {
    const url = new URL(base);
    if (url.username || url.password || url.search || url.hash || !url.hostname)
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        process.env.AI_ALLOW_INSECURE_HTTP_LOCALHOST === "true" &&
        (process.env.NODE_ENV !== "production" ||
          process.env.E2E_TEST_MODE === "true") &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )
    )
      return null;
    return { url, apiKey, model };
  } catch {
    return null;
  }
}

export function aiConfigured() {
  return Boolean(aiBaseUrl());
}

async function responseText(response: Response) {
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_AI_RESPONSE_BYTES)
      throw new Error("AI 응답이 너무 큽니다.");
    return text;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_AI_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error("AI 응답이 너무 큽니다.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function completeChat(messages: ChatMessage[]) {
  const config = aiBaseUrl();
  if (!config) throw new Error("AI 연결이 아직 설정되지 않았습니다.");
  const parsedMessages = z
    .array(chatMessageSchema)
    .min(1)
    .max(18)
    .parse(messages);
  const promptChars = parsedMessages.reduce(
    (total, message) => total + message.content.length,
    0,
  );
  if (promptChars > MAX_AI_PROMPT_CHARS)
    throw new Error("AI 요청 문맥이 너무 큽니다.");
  const endpoint = new URL(
    "chat/completions",
    `${config.url.toString().replace(/\/+$/, "")}/`,
  );
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: parsedMessages,
      max_tokens: 1600,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  const result = chatResponseSchema.parse(
    JSON.parse(await responseText(response)),
  );
  return {
    content: result.choices[0].message.content,
    tokens: result.usage?.total_tokens ?? 0,
  };
}
