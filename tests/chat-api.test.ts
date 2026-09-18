import { test } from "node:test";
import assert from "node:assert/strict";
import { readChatResponse } from "../src/lib/chat-api";

test("AI API의 HTML 오류 응답은 사용자용 안내로 변환된다", async () => {
  const response = new Response("<!DOCTYPE html><html></html>", {
    status: 502,
    headers: { "content-type": "text/html" },
  });
  await assert.rejects(
    () => readChatResponse(response),
    (error: unknown) =>
      error instanceof Error &&
      error.message ===
        "AI 서비스가 잠시 응답하지 않아요. 잠시 후 다시 시도해 주세요.",
  );
});

test("AI API의 JSON 오류 메시지는 그대로 유지된다", async () => {
  const response = new Response(
    JSON.stringify({ error: "로그인이 필요합니다." }),
    {
      status: 401,
      headers: { "content-type": "application/json" },
    },
  );
  await assert.rejects(
    () => readChatResponse(response),
    (error: unknown) =>
      error instanceof Error && error.message === "로그인이 필요합니다.",
  );
});

test("AI API의 성공 응답은 메시지와 사용량을 검증한다", async () => {
  const data = {
    message: { id: "answer-1", role: "assistant", content: "시작해 봐요." },
    used: 1,
    limit: 10,
  };
  const response = new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  assert.deepEqual(await readChatResponse(response), data);
});
