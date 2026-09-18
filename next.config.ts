import type { NextConfig } from "next";
const allowedOrigins = (process.env.SERVER_ACTION_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isAllowedOrigin = (origin: string) => {
  const host = origin.startsWith("*.") ? origin.slice(2) : origin;
  if (!host || host.includes("*") || host.includes("://")) return false;
  try {
    const url = new URL(`https://${host}`);
    return (
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};
if (allowedOrigins.some((origin) => !isAllowedOrigin(origin))) {
  throw new Error(
    "SERVER_ACTION_ALLOWED_ORIGINS에 유효하지 않은 원본이 있습니다.",
  );
}
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self'; connect-src 'self' https:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];
const config: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      ...(allowedOrigins.length ? { allowedOrigins } : {}),
    },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};
export default config;
