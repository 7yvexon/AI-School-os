import { createHash } from "node:crypto";
import { isIP } from "node:net";

function validIp(value: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized && isIP(normalized) ? normalized : null;
}

export function requestIp(headers: Headers) {
  if (process.env.TRUST_PROXY?.trim() === "true") {
    const cloudflare = validIp(headers.get("cf-connecting-ip"));
    if (cloudflare) return cloudflare;
  }
  return "direct";
}

export function hashIdentifier(value: string) {
  if (typeof value !== "string")
    throw new TypeError("Identifier must be a string.");
  return createHash("sha256").update(value).digest("hex");
}
