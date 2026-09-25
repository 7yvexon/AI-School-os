"use client";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main id="main-content" className="content" tabIndex={-1}>
      <div className="card card-pad" role="alert">
        <h1>화면을 불러오지 못했어요</h1>
        <p>
          다시 시도해 주세요. 문제가 계속되면 운영 담당자에게 문의해 주세요.
        </p>
        <button className="btn btn-primary" onClick={retry}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
