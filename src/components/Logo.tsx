import Link from "next/link";
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="AI School OS 홈">
      <span className="brand-mark">A</span>
      <span>AI School OS</span>
    </Link>
  );
}
