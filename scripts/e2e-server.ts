import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFile, spawn, spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
let pg: EmbeddedPostgres | undefined;
let mock: Server | undefined;
let next: ReturnType<typeof spawn> | undefined;
let postgresPid: number | undefined;
let postgresDirectory = "";
let stopping = false;

function forceKillPostgres() {
  if (process.platform !== "win32") return;
  if (postgresPid)
    spawnSync("taskkill", ["/pid", String(postgresPid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore",
    });
  if (postgresDirectory) {
    const pattern = postgresDirectory.replace(/\\/g, "/").replace(/'/g, "''");
    const script = `$processes = Get-CimInstance Win32_Process -Filter \"Name = 'postgres.exe'\" | Where-Object { $_.CommandLine -like '*${pattern}*' }; $processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true, stdio: "ignore" },
    );
  }
}
process.once("exit", forceKillPostgres);

async function stop(code: number) {
  if (stopping) return;
  stopping = true;
  if (next?.pid) {
    try {
      if (process.platform === "win32")
        await execFileAsync("taskkill", ["/pid", String(next.pid), "/t", "/f"]);
      else next.kill("SIGTERM");
    } catch {}
  }
  if (mock?.listening)
    await new Promise<void>((done) => mock?.close(() => done()));
  if (pg) await pg.stop().catch(() => undefined);
  forceKillPostgres();
  process.exitCode = code;
}

async function main() {
  const databaseDir = resolve(
    process.env.E2E_DATABASE_DIR ?? ".local/e2e-postgres",
  );
  postgresDirectory = databaseDir;
  pg = new EmbeddedPostgres({
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
  postgresPid = (pg as unknown as { process?: { pid?: number } }).process?.pid;
  const client = pg.getPgClient("postgres");
  await client.connect();
  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = 'school_e2e'",
  );
  await client.end();
  if (!result.rowCount) await pg.createDatabase("school_e2e");
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL:
      "postgresql://school:e2e_password@localhost:55433/school_e2e?schema=public",
    AUTH_SECRET: "e2e-only-secret-at-least-thirty-two-characters",
    NODE_ENV: "test",
    APP_URL: "http://localhost:3100",
    TRUST_PROXY: "false",
    SERVER_ACTION_ALLOWED_ORIGINS: "",
    TEACHER_INVITE_CODE: "e2e-teacher-invite",
    AI_API_KEY: "local-test-key",
    AI_BASE_URL: "http://127.0.0.1:4318/v1",
    AI_MODEL: "test-fixture",
    AI_ALLOW_INSECURE_HTTP_LOCALHOST: "true",
  };
  // Deterministic test provider only; production code has no mock switch.
  mock = createServer(async (req, res) => {
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
      "E2E 탐구 과제",
      "탐구",
      "주제 선정",
      "daysRemaining",
      "currentDate",
    ];
    if (!expected.every((value) => context.includes(value))) {
      res.writeHead(400).end("Missing assignment context");
      return;
    }
    if (
      ['"name"', '"school"', "테스트 학생"].some((value) =>
        context.includes(value),
      )
    ) {
      res.writeHead(400).end("Unexpected profile data");
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
                "탐구 E2E 탐구 과제: 먼저 주제 선정부터 시작하세요. 오늘 30분 계획을 함께 세워봅시다.",
            },
          },
        ],
        usage: { total_tokens: 123 },
      }),
    );
  });
  await new Promise<void>((done, reject) => {
    mock?.once("error", reject);
    mock?.listen(4318, "127.0.0.1", () => done());
  });
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
  const cleanupClient = pg.getPgClient("school_e2e");
  await cleanupClient.connect();
  await cleanupClient.query('TRUNCATE "RateLimit", "Session"');
  await cleanupClient.end();
  const nextProcess = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", "3100"],
    { env, stdio: "inherit", windowsHide: true },
  );
  next = nextProcess;
  process.once("SIGINT", () => void stop(0));
  process.once("SIGTERM", () => void stop(0));
  process.once("SIGBREAK", () => void stop(0));
  nextProcess.once("error", (error) => {
    console.error("Next 서버를 시작하지 못했습니다.", error);
    void stop(1);
  });
  nextProcess.once("exit", (code, signal) => {
    if (!stopping)
      console.error(
        `Next 서버가 예기치 않게 종료되었습니다. code=${code ?? "null"} signal=${signal ?? "null"}`,
      );
    void stop(stopping ? 0 : (code ?? 1));
  });
}
main().catch(async (e) => {
  await stop(1);
  console.error(e);
  process.exitCode = 1;
});
