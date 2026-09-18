"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="card card-pad" role="alert">
      <h1>잠시 연결이 원활하지 않아요</h1>
      <p>학생 공간을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
      <div className="detail-actions">
        <button className="btn btn-primary" onClick={reset} type="button">
          다시 시도
        </button>
        <Link className="btn btn-secondary" href="/student/dashboard">
          대시보드로 이동
        </Link>
      </div>
    </div>
  );
}
