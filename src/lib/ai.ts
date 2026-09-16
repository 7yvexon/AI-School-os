import "server-only";
import { z } from "zod";
import { MAX_AI_RESPONSE_CHARS } from "./limits";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
export function aiConfigured() {
  const base = process.env.AI_BASE_URL?.trim();
  if (!process.env.AI_API_KEY || !process.env.AI_MODEL || !base) return false;
  try {
    const url = new URL(base);
    if (url.username || url.password) return false;
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (process.env.NODE_ENV !== "production" ||
          (process.env.AI_ALLOW_INSECURE_HTTP_LOCALHOST === "true" &&
            ["localhost", "127.0.0.1", "::1"].includes(url.hostname))))
    );
  } catch {
    return false;
  }
}
export async function completeChat(messages: ChatMessage[]) {
  if (!aiConfigured()) throw new Error("AI 연결이 아직 설정되지 않았습니다.");
  const base = process.env.AI_BASE_URL!.trim().replace(/\/+$/, "");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL,
      messages,
      max_tokens: 1600,
    }),
    signal: AbortSignal.timeout(60000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new Error(
      "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  const result = z
    .object({
      choices: z
        .array(
          z.object({
            message: z.object({
              content: z.string().min(1).max(MAX_AI_RESPONSE_CHARS),
            }),
          }),
        )
        .min(1),
      usage: z
        .object({ total_tokens: z.number().int().nonnegative() })
        .optional(),
    })
    .parse(await response.json());
  return {
    content: result.choices[0].message.content,
    tokens: result.usage?.total_tokens ?? 0,
  };
}
