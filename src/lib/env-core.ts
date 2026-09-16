export type RuntimeEnvSource = {
  DATABASE_URL?: string;
  AUTH_SECRET?: string;
  APP_URL?: string;
  TRUST_PROXY?: string;
  SERVER_ACTION_ALLOWED_ORIGINS?: string;
  NODE_ENV?: string;
};

export type RuntimeConfig = {
  databaseUrl: string;
  authSecret: string;
  appUrl: string;
  trustProxy: boolean;
  serverActionAllowedOrigins: string[];
};

export class RuntimeConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("운영 환경 설정이 올바르지 않습니다.");
    this.name = "RuntimeConfigError";
    this.issues = issues;
  }
}

function isDatabaseUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

function isAppUrl(value: string, production: boolean) {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return false;
    return !production || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedOrigin(value: string) {
  const host = value.startsWith("*.") ? value.slice(2) : value;
  if (!host || host.includes("://")) return false;
  try {
    const url = new URL(`https://${host}`);
    return url.pathname === "/" && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function parseRuntimeConfig(
  source: RuntimeEnvSource,
  production = source.NODE_ENV === "production",
): RuntimeConfig {
  const issues: string[] = [];
  const databaseUrl = source.DATABASE_URL?.trim() ?? "";
  const authSecret = source.AUTH_SECRET ?? "";
  const appUrl = source.APP_URL?.trim() ?? "";
  const trustProxy = source.TRUST_PROXY?.trim() || "false";
  const serverActionAllowedOrigins = (
    source.SERVER_ACTION_ALLOWED_ORIGINS ?? ""
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!databaseUrl || !isDatabaseUrl(databaseUrl))
    issues.push("DATABASE_URL은 유효한 PostgreSQL 연결 문자열이어야 합니다.");
  if (authSecret.length < 32)
    issues.push("AUTH_SECRET은 32자 이상의 무작위 값이어야 합니다.");
  if (!appUrl || !isAppUrl(appUrl, production))
    issues.push(
      production
        ? "운영 환경의 APP_URL은 HTTPS 원본 URL이어야 합니다."
        : "APP_URL은 HTTP 또는 HTTPS 원본 URL이어야 합니다.",
    );
  if (trustProxy !== "true" && trustProxy !== "false")
    issues.push('TRUST_PROXY는 "true" 또는 "false"여야 합니다.');
  if (!serverActionAllowedOrigins.every(isAllowedOrigin))
    issues.push(
      "SERVER_ACTION_ALLOWED_ORIGINS는 도메인 또는 와일드카드 도메인의 쉼표 목록이어야 합니다.",
    );

  if (issues.length) throw new RuntimeConfigError(issues);

  return {
    databaseUrl,
    authSecret,
    appUrl,
    trustProxy: trustProxy === "true",
    serverActionAllowedOrigins,
  };
}
