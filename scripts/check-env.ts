import "dotenv/config";
import { parseRuntimeConfig, RuntimeConfigError } from "../src/lib/env-core";

try {
  const config = parseRuntimeConfig(process.env);
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
