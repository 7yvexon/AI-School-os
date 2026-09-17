"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="content">
      <div className="card card-pad" role="alert">
        <h1>잠시 연결이 원활하지 않아요</h1>
        <p>
          잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
        </p>
        <button className="btn btn-primary" onClick={reset}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
