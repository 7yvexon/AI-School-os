import { defineConfig } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";

process.env.PLAYWRIGHT_BROWSERS_PATH ||= "0";
process.env.E2E_DATABASE_DIR ||= ".local/e2e-postgres-v2";
const e2eDatabaseDir = resolve(process.env.E2E_DATABASE_DIR);
const e2ePasswordPath = `${e2eDatabaseDir}.password`;
mkdirSync(dirname(e2ePasswordPath), { recursive: true });
let e2eDatabasePassword = existsSync(e2ePasswordPath)
  ? readFileSync(e2ePasswordPath, "utf8").trim()
  : "";
if (!e2eDatabasePassword) {
  const generated = randomBytes(24).toString("hex");
  try {
    writeFileSync(e2ePasswordPath, `${generated}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    e2eDatabasePassword = generated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    e2eDatabasePassword = readFileSync(e2ePasswordPath, "utf8").trim();
  }
}
process.env.E2E_DATABASE_PASSWORD = e2eDatabasePassword;
process.env.E2E_TEACHER_INVITE_CODE ||= randomBytes(18).toString("hex");
process.env.E2E_TEST_PASSWORD ||= randomBytes(24).toString("base64url");
process.env.DATABASE_URL = `postgresql://school:${e2eDatabasePassword}@localhost:55433/school_e2e?schema=public`;
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180000,
  expect: { timeout: 30000 },
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    browserName: "chromium",
  },
  webServer: {
    command: "node --import tsx scripts/e2e-server.ts",
    url: "http://localhost:3100",
    timeout: 120000,
    reuseExistingServer: false,
  },
});
