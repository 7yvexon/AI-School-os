export type RuntimeEnvSource = {
  DATABASE_URL?: string;
  AUTH_SECRET?: string;
  APP_URL?: string;
  TRUST_PROXY?: string;
  SERVER_ACTION_ALLOWED_ORIGINS?: string;
  NODE_ENV?: string;
  AI_ALLOW_INSECURE_HTTP_LOCALHOST?: string;
  E2E_TEST_MODE?: string;
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
      Boolean(url.hostname) &&
      !url.hash
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
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return false;
    return !production || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isAllowedOrigin(value: string) {
  const wildcard = value.startsWith("*.");
  const host = wildcard ? value.slice(2) : value;
  if (!host || host === "*" || host.includes("://")) return false;
  try {
    const url = new URL(`https://${host}`);
    return (
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password &&
      !url.hostname.includes("*") &&
      (!wildcard || !url.hostname.includes(":"))
    );
  } catch {
    return false;
  }
}

export function parseRuntimeConfig(
  source: RuntimeEnvSource,
  production?: boolean,
): RuntimeConfig {
  const issues: string[] = [];
  const env = (
    source && typeof source === "object" ? source : {}
  ) as RuntimeEnvSource;
  const isProduction =
    production ??
    (typeof env.NODE_ENV === "string" && env.NODE_ENV.trim() === "production");
  const validNodeEnvironments = ["development", "production", "test"];
  const databaseUrl =
    typeof env.DATABASE_URL === "string" ? env.DATABASE_URL.trim() : "";
  const authSecret = typeof env.AUTH_SECRET === "string" ? env.AUTH_SECRET : "";
  const appUrl = typeof env.APP_URL === "string" ? env.APP_URL.trim() : "";
  const trustProxy =
    typeof env.TRUST_PROXY === "string"
      ? env.TRUST_PROXY.trim() || "false"
      : "false";
  const allowedOrigins = env.SERVER_ACTION_ALLOWED_ORIGINS;
  const serverActionAllowedOrigins =
    typeof allowedOrigins === "string"
      ? allowedOrigins
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
      : [];

  if (
    typeof env.SERVER_ACTION_ALLOWED_ORIGINS !== "undefined" &&
    typeof env.SERVER_ACTION_ALLOWED_ORIGINS !== "string"
  )
    issues.push(
      "SERVER_ACTION_ALLOWED_ORIGINS는 도메인 또는 와일드카드 도메인의 쉼표 목록이어야 합니다.",
    );
  if (
    typeof env.NODE_ENV !== "undefined" &&
    (typeof env.NODE_ENV !== "string" ||
      !validNodeEnvironments.includes(env.NODE_ENV))
  )
    issues.push(
      'NODE_ENV는 "development", "production" 또는 "test"여야 합니다.',
    );
  if (
    typeof env.TRUST_PROXY !== "undefined" &&
    typeof env.TRUST_PROXY !== "string"
  )
    issues.push('TRUST_PROXY는 "true" 또는 "false"여야 합니다.');

  if (!databaseUrl || !isDatabaseUrl(databaseUrl))
    issues.push("DATABASE_URL은 유효한 PostgreSQL 연결 문자열이어야 합니다.");
  if (
    authSecret.length < 32 ||
    authSecret.trim() !== authSecret ||
    /[\u0000-\u001f\u007f]/.test(authSecret)
  )
    issues.push("AUTH_SECRET은 32자 이상의 무작위 값이어야 합니다.");
  if (!appUrl || !isAppUrl(appUrl, isProduction))
    issues.push(
      isProduction
        ? "운영 환경의 APP_URL은 HTTPS 원본 URL이어야 합니다."
        : "APP_URL은 HTTP 또는 HTTPS 원본 URL이어야 합니다.",
    );
  if (trustProxy !== "true" && trustProxy !== "false")
    issues.push('TRUST_PROXY는 "true" 또는 "false"여야 합니다.');
  if (isProduction && trustProxy !== "true")
    issues.push(
      "운영 환경은 실제 클라이언트 IP를 전달하는 신뢰 프록시 뒤에서 실행해야 합니다.",
    );
  if (
    isProduction &&
    (env.AI_ALLOW_INSECURE_HTTP_LOCALHOST === "true" ||
      env.E2E_TEST_MODE === "true")
  )
    issues.push("E2E 전용 설정은 운영 환경에서 사용할 수 없습니다.");
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
