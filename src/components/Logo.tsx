import Link from "next/link";
export function Logo({
  href = "/",
  label = "AI School OS 홈",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link className="brand" href={href} aria-label={label}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="brand-name">
        AI School <strong>OS</strong>
      </span>
    </Link>
  );
}
