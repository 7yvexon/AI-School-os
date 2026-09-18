import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card card-pad">
      <h1>페이지를 찾을 수 없어요</h1>
      <p>주소를 확인하거나 교사 대시보드에서 다시 시작해 주세요.</p>
      <Link href="/teacher/dashboard" className="btn btn-primary">
        대시보드로 돌아가기
      </Link>
    </div>
  );
}
