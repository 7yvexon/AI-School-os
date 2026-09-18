export default function Loading() {
  return (
    <div role="status" aria-live="polite">
      <div className="page-heading" aria-hidden="true">
        <div className="skeleton" />
      </div>
      <div className="skeleton" aria-hidden="true" />
      <div className="skeleton" aria-hidden="true" />
      <p>수업 관리를 불러오는 중입니다…</p>
    </div>
  );
}
