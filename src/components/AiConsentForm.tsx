"use client";

import { useActionState } from "react";
import Link from "next/link";
import { mutate, type ActionState } from "@/app/actions";
import { ActionMessage } from "./ActionMessage";
import { SubmitButton } from "./SubmitButton";

export function AiConsentForm({
  granted = false,
  savedConsent = granted,
  provider,
}: {
  granted?: boolean;
  savedConsent?: boolean;
  provider: { host: string; model: string } | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(mutate, {});
  const [revokeState, revokeAction] = useActionState<ActionState, FormData>(
    mutate,
    {},
  );
  return (
    <section className="card card-pad">
      <h2 className="small-heading">AI 사용 동의</h2>
      <div className="ai-consent-details">
        <p className="prose-like">
          동의하면 학년, 과제 정보, 최근 대화와 현재 질문이 아래 제공자에게
          전송됩니다. 이름·학교·반은 프로필에서 자동으로 붙이지 않지만,
          질문·대화·과제 내용에 직접 적은 정보는 전송될 수 있습니다.
        </p>
        <p className="form-hint">
          {provider
            ? `제공자: ${provider.host} · 모델: ${provider.model}`
            : "현재 외부 AI 제공자가 설정되어 있지 않습니다."}
        </p>
        <p className="form-hint">
          AI 대화는 최근 최대 16개 메시지(총 24,000자 이내)를 문맥으로 사용하며,
          화면에는 최신 100개 메시지를 표시합니다. 이 서비스에는 학생이 직접
          삭제하기 전까지 보관됩니다. 동의를 철회해도 기존 기록은 삭제되지
          않습니다. 이미 진행 중인 질문은 제공자에게 전송될 수 있습니다.
        </p>
        {!granted && savedConsent && (
          <p className="form-hint" role="status">
            제공자 또는 모델 설정이 바뀌어 다시 동의해야 합니다. 기존 대화
            기록은 남아 있으므로, 필요하면 아래에서 삭제하세요.
          </p>
        )}
        <p className="form-hint">
          외부 제공자의 보관·삭제 정책은 제공자 설정에 따릅니다. 시연용
          서비스에는 실제 개인정보나 제출물을 입력하지 마세요.
        </p>
        <Link className="text-link" href="/privacy">
          개인정보 안내 전체 보기
        </Link>
      </div>
      <ActionMessage state={state} />
      {granted ? (
        <form action={revokeAction}>
          <input type="hidden" name="op" value="ai-consent-revoke" />
          <SubmitButton className="btn btn-secondary">
            AI 사용 동의 철회
          </SubmitButton>
          <ActionMessage state={revokeState} />
        </form>
      ) : (
        <div className="ai-consent-actions">
          <form action={action}>
            <input type="hidden" name="op" value="ai-consent" />
            <SubmitButton disabled={!provider}>
              {savedConsent
                ? "현재 AI 설정에 다시 동의하기"
                : "AI 사용 동의하기"}
            </SubmitButton>
          </form>
          {savedConsent && (
            <form action={revokeAction}>
              <input type="hidden" name="op" value="ai-consent-revoke" />
              <SubmitButton className="btn btn-secondary">
                AI 사용 동의 철회
              </SubmitButton>
              <ActionMessage state={revokeState} />
            </form>
          )}
        </div>
      )}
    </section>
  );
}
