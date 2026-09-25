export default function Loading() {
  return (
    <div>
      <div className="page-heading" aria-hidden="true">
        <div className="skeleton" />
      </div>
      <div className="skeleton" aria-hidden="true" />
      <div className="skeleton" aria-hidden="true" />
      <p role="status" aria-live="polite">
        학교생활을 불러오는 중입니다…
      </p>
    </div>
  );
}
