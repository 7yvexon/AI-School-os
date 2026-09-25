import Link from "next/link";
import { Heading } from "@/components/WorkspaceViews";
import { aiProviderDisclosure } from "@/lib/ai";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = {
  ...pageMetadata(
    "개인정보 안내",
    "AI School OS 시연 서비스의 개인정보 수집, 이용, 저장 및 삭제 안내.",
  ),
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  const provider = aiProviderDisclosure();
  return (
    <main id="main-content" className="content privacy-page" tabIndex={-1}>
      <Heading
        eyebrow="PRIVACY INFORMATION"
        title="개인정보 안내"
        description="AI School OS는 교육·시연용 MVP입니다. 실제 학생·교직원 개인정보나 제출물을 입력하지 마세요."
      />
      <div className="privacy-sections">
        <section className="card card-pad" aria-labelledby="privacy-scope">
          <h2 id="privacy-scope">서비스와 수집 정보</h2>
          <p className="prose-like">
            이 시연 서비스는 계정 이름·이메일·비밀번호 해시·역할, 선택 입력한
            학교·학년·반, 클래스 참여와 과제 제출·검토 기록, 개인 일정과 AI 대화
            기록을 저장합니다. 신규 가입에서는 전화번호를 요청하지 않습니다.
            이전 버전에서 만든 계정에는 기존 전화번호 값이 남아 있을 수
            있습니다.
          </p>
          <p className="prose-like">
            비밀번호는 복구 가능한 평문으로 저장하지 않습니다. 교사는 본인
            클래스의 학생 이름과 선택한 학교·학년·반 정보, 제출물 및 피드백을 볼
            수 있습니다. 클래스에서 학생을 제외하거나 과제를 보관해도 관련
            제출·검토 이력은 보존됩니다.
          </p>
        </section>
        <section className="card card-pad" aria-labelledby="privacy-ai">
          <h2 id="privacy-ai">AI 이용과 외부 전송</h2>
          <p className="prose-like">
            학생이 AI 사용에 동의하고 질문을 보낼 때 학년, 과목·과제 정보, 최근
            대화 일부와 현재 질문이 외부 AI 제공자에게 전송됩니다. 프로필의
            이름, 학교, 반, 이메일은 요청에 자동으로 포함하지 않지만, 학생이나
            선생님이 질문·대화·과제 내용에 직접 적은 정보는 자동으로 걸러지지
            않습니다.
          </p>
          <p className="prose-like">
            현재 연결 상태:{" "}
            {provider
              ? `${provider.host} · ${provider.model}`
              : "외부 AI 제공자가 설정되지 않았습니다."}
          </p>
          <p className="prose-like">
            앱에 저장된 AI 대화는 학생이 설정에서 삭제할 때까지 유지되며, 동의
            철회만으로 기존 대화가 삭제되지는 않습니다. 삭제한 뒤 다시 질문하면
            새 기록이 생성됩니다. 이미 진행 중인 질문은 동의를 철회하거나 삭제한
            뒤에도 외부 제공자에게 전송될 수 있습니다. 외부 제공자의 보관·삭제
            정책은 해당 제공자의 설정과 약관을 따릅니다.
          </p>
        </section>
        <section className="card card-pad" aria-labelledby="privacy-retention">
          <h2 id="privacy-retention">보유와 삭제</h2>
          <p className="prose-like">
            AI 대화는 설정에서 직접 삭제할 수 있습니다. 계정 자체를 삭제하거나
            프로필 및 제출 이력을 앱에서 직접 지우는 기능은 제공하지 않습니다.
            계정·기록 관련 요청은 서비스 운영 담당자에게 별도로 문의해 주세요.
            공개 GitHub 이슈에 비밀번호, 학생 이름, 이메일, 제출 내용 등
            개인정보를 올리지 마세요.
          </p>
          <p className="prose-like">
            과제와 학생을 보관·제외하는 기능은 복구 가능한 상태 변경이며 영구
            삭제를 뜻하지 않습니다. 실제 운영을 위한 보유 기간, 계정 삭제 및
            백업 정책은 이 MVP에 구성되어 있지 않습니다.
          </p>
        </section>
        <div className="privacy-page__actions">
          <Link className="btn btn-secondary" href="/register">
            회원가입으로 돌아가기
          </Link>
          <Link className="text-link" href="/">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </main>
  );
}
