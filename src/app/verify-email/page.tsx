import Link from "next/link";
import { Heading } from "@/components/WorkspaceViews";
import { pageMetadata } from "@/lib/page-metadata";

export const metadata = {
  ...pageMetadata(
    "이메일 확인 안내",
    "이메일 확인 기능 지원 여부와 다음 단계를 확인하세요.",
  ),
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main id="main-content" className="content auth-notice-page" tabIndex={-1}>
      <Heading
        title="이메일 확인을 지원하지 않습니다"
        description="이 시연용 서비스는 이메일 인증 메일을 보내지 않습니다. 가입 직후에는 역할별 화면으로 이동합니다."
      />
      <div className="card card-pad">
        <p className="prose-like">
          가입 여부나 계정 복구가 필요하면 서비스 운영 담당자에게 별도로 문의해
          주세요. 공개 GitHub 이슈에는 이메일 주소나 계정 정보를 올리지 마세요.
        </p>
        <div className="detail-actions">
          <Link className="btn btn-primary" href="/login">
            로그인
          </Link>
          <Link className="btn btn-secondary" href="/register">
            회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}
