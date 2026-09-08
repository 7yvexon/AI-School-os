import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:http";

async function main() {
  const databaseDir = resolve(".local/e2e-postgres");
  const pg = new EmbeddedPostgres({
    databaseDir,
    port: 55433,
    user: "school",
    password: "e2e_password",
    persistent: true,
    authMethod: "scram-sha-256",
    initdbFlags: ["--locale=C", "--encoding=UTF8"],
    postgresFlags: ["-h", "127.0.0.1"],
    onLog: () => {},
    onError: () => {},
  });
  if (!existsSync(resolve(databaseDir, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient("postgres");
  await client.connect();
  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = 'school_e2e'",
  );
  await client.end();
  if (!result.rowCount) await pg.createDatabase("school_e2e");
  const env = {
    ...process.env,
    DATABASE_URL:
      "postgresql://school:e2e_password@localhost:55433/school_e2e?schema=public",
    AUTH_SECRET: "e2e-only-secret-at-least-thirty-two-characters",
    APP_URL: "http://localhost:3100",
    AI_API_KEY: "local-test-key",
    AI_BASE_URL: "http://127.0.0.1:4318/v1",
    AI_MODEL: "test-fixture",
  };
  // Deterministic test provider only; production code has no mock switch.
  const mock = createServer(async (req, res) => {
    if (req.url !== "/v1/chat/completions") {
      res.writeHead(404).end();
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body) as {
      messages: { role: string; content: string }[];
    };
    if (payload.messages.at(-1)?.content === "FAIL_PROVIDER") {
      res.writeHead(500).end();
      return;
    }
    const context = payload.messages[0].content;
    const expected = [
      "E2E 데이터 분석",
      "정보",
      "데이터 선정",
      "daysRemaining",
      "currentDate",
    ];
    if (!expected.every((value) => context.includes(value))) {
      res.writeHead(400).end("Missing assignment context");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        choices: [
          {
            message: {
              content:
                "정보 E2E 데이터 분석: 먼저 데이터 선정부터 시작하세요. 오늘 30분 계획을 함께 세워봅시다.",
            },
          },
        ],
        usage: { total_tokens: 123 },
      }),
    );
  });
  mock.listen(4318, "127.0.0.1");
  await new Promise<void>((done, reject) => {
    const migrate = spawn(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      { env, stdio: "inherit", windowsHide: true },
    );
    migrate.on("exit", (code) =>
      code === 0 ? done() : reject(new Error(`Migration failed: ${code}`)),
    );
    migrate.on("error", reject);
  });
  const next = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3100"],
    { env, stdio: "inherit", windowsHide: true },
  );
  const stop = async () => {
    next.kill();
    mock.close();
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  next.on("exit", () => {
    void stop();
  });
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
