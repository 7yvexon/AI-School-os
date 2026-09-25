"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <div className="card card-pad" role="alert">
      <h1>교사 화면을 불러오지 못했어요</h1>
      <p>다시 시도하거나 홈으로 이동해 주세요.</p>
      <div className="detail-actions">
        <button className="btn btn-primary" onClick={retry} type="button">
          다시 시도
        </button>
        <Link className="btn btn-secondary" href="/">
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
