import Link from "next/link";
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="AI School OS 홈">
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
