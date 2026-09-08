import Link from "next/link";
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="brand-mark">A</span>
      <span>AI School OS</span>
    </Link>
  );
}
