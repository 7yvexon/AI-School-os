import { z } from "zod";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
export function aiConfigured() {
  return Boolean(
    process.env.AI_API_KEY && process.env.AI_MODEL && process.env.AI_BASE_URL,
  );
}
export async function completeChat(messages: ChatMessage[]) {
  if (!aiConfigured()) throw new Error("AI 연결이 아직 설정되지 않았습니다.");
  const base = process.env.AI_BASE_URL!.replace(/\/+$/, "");
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
            message: z.object({ content: z.string().min(1).max(40000) }),
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
