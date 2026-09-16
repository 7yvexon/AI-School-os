import { defineConfig } from "@playwright/test";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= "0";
process.env.DATABASE_URL =
  "postgresql://school:e2e_password@localhost:55433/school_e2e?schema=public";
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
