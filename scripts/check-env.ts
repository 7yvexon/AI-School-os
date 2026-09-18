import "dotenv/config";
import { parseRuntimeConfig, RuntimeConfigError } from "../src/lib/env-core";

try {
  const forceProduction = process.argv.slice(2).includes("--production");
  const production = forceProduction || process.env.NODE_ENV === "production";
  if (
    production &&
    (process.env.E2E_TEST_MODE === "true" ||
      process.env.AI_ALLOW_INSECURE_HTTP_LOCALHOST === "true")
  )
    throw new Error(
      "E2E 전용 AI HTTP 설정은 운영 환경에서 사용할 수 없습니다.",
    );
  const config = parseRuntimeConfig(process.env, production ? true : undefined);
  console.log(
    "환경 설정 확인 완료:",
    config.appUrl,
    "· 프록시 신뢰",
    config.trustProxy ? "사용" : "미사용",
  );
} catch (error) {
  if (error instanceof RuntimeConfigError) {
    console.error("환경 설정을 확인하지 못했습니다.");
    for (const issue of error.issues) console.error(`- ${issue}`);
  } else {
    console.error("환경 설정을 확인하지 못했습니다.");
  }
  process.exitCode = 1;
}
