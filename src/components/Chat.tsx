"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MessageCircle, Send } from "lucide-react";
import { readChatResponse, type ChatApiMessage } from "@/lib/chat-api";
import {
  PROMPT_DRAFT_KEY,
  PROMPT_DRAFT_MODE_KEY,
  getPromptDraft,
  subscribePromptDraft,
} from "@/lib/prompt-draft";
type Message = ChatApiMessage;
export function Chat({
  assignmentId,
  initialMessages,
  configured,
  initialUsed,
  limit,
}: {
  assignmentId: string;
  initialMessages: Message[];
  configured: boolean;
  initialUsed: number;
  limit: number;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [editedQuestion, setEditedQuestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [used, setUsed] = useState(initialUsed);
  const [hasConsumedDraft, setHasConsumedDraft] = useState(false);
  const pendingPrompt = useSyncExternalStore(
    subscribePromptDraft,
    getPromptDraft,
    () => "",
  );
  const question = editedQuestion ?? pendingPrompt;
  const hasPendingDraft = Boolean(pendingPrompt) && !hasConsumedDraft;
  const end = useRef<HTMLDivElement>(null);
  const limitReached = used >= limit;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !question.trim()) return;
    setBusy(true);
    setError("");
    const content = question.trim();
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignmentId, message: content }),
      });
      const data = await readChatResponse(response);
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "user", content },
        data.message,
      ]);
      setEditedQuestion("");
      setUsed(data.used);
      if (hasPendingDraft) {
        try {
          window.sessionStorage.removeItem(PROMPT_DRAFT_KEY);
          window.sessionStorage.removeItem(PROMPT_DRAFT_MODE_KEY);
        } catch {
          setError("질문은 전송했지만 저장된 시작 문장을 지우지 못했어요.");
        }
        setHasConsumedDraft(true);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "네트워크 연결을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card chat-card">
      <div className="card-pad chat-heading">
        <div>
          <h2>
            <MessageCircle size={18} /> AI 과제 도우미
          </h2>
          <p>이 과제의 설명과 평가기준을 알고 있어요.</p>
        </div>
        <span className="badge badge-blue">
          오늘 {used}/{limit}
        </span>
      </div>
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <MessageCircle size={28} />
            <h3>어디서부터 시작할까요?</h3>
            <p>완성본보다 스스로 해낼 수 있는 방법을 함께 찾아요.</p>
            {[
              "뭐부터 해야 해?",
              "오늘 30분 동안 할 일을 알려줘",
              "평가기준에 맞는 체크리스트를 만들어줘",
            ].map((q) => (
              <button
                className="suggestion"
                key={q}
                onClick={() => setEditedQuestion(q)}
                disabled={!configured}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`message ${m.role}`}>
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="message assistant" role="status">
            과제에 맞는 답변을 생각하고 있어요…
          </div>
        )}
        <div ref={end} />
      </div>
      {!configured && (
        <div className="alert alert-error" style={{ margin: 12 }} role="alert">
          AI 서비스 연결이 필요합니다. 관리자에게 문의해 주세요.
        </div>
      )}
      {limitReached && (
        <p className="chat-limit" id="chat-limit" role="status">
          오늘 질문 한도에 도달했어요. 한국 시간 자정에 다시 사용할 수 있습니다.
        </p>
      )}
      {error && (
        <div className="alert alert-error" role="alert" style={{ margin: 12 }}>
          {error}
        </div>
      )}
      <form className="chat-form" onSubmit={submit}>
        <textarea
          aria-label="AI에게 질문"
          aria-describedby={limitReached ? "chat-limit" : undefined}
          value={question}
          onChange={(e) => setEditedQuestion(e.target.value)}
          maxLength={2000}
          placeholder="과제에 대해 궁금한 점을 물어보세요"
          disabled={!configured || busy || limitReached}
        />
        <button
          className="btn btn-primary"
          disabled={!configured || busy || !question.trim() || limitReached}
          aria-label="질문 보내기"
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}
