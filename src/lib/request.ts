import { createHash } from "node:crypto";

export function requestIp(headers: Headers) {
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return forwarded;
    const real = headers.get("x-real-ip")?.trim();
    if (real) return real;
  }
  return "direct";
}

export function hashIdentifier(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
