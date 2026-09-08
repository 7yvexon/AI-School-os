import Link from "next/link";
export default function NotFound() {
  return (
    <div className="auth-shell">
      <div className="card card-pad">
        <h1>페이지를 찾을 수 없어요</h1>
        <p>주소 또는 클래스 접근 권한을 확인해 주세요.</p>
        <Link href="/" className="btn btn-primary">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
