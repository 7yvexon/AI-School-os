export default function Loading() {
  return (
    <main id="main-content" className="content" tabIndex={-1}>
      <div className="skeleton" aria-hidden="true" />
      <div className="skeleton" aria-hidden="true" />
      <p role="status" aria-live="polite">
        학교생활을 불러오는 중입니다…
      </p>
    </main>
  );
}
