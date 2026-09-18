import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { chmod, lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile, spawn, spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { randomBytes } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
let pg: EmbeddedPostgres | undefined;
let mock: Server | undefined;
let next: ReturnType<typeof spawn> | undefined;
let postgresPid: number | undefined;
let postgresDirectory = "";
let stopping = false;
const workspaceDirectory = process.cwd();

async function readOrCreateSecret(path: string) {
  if (existsSync(path)) {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error(`비밀값 파일은 일반 파일이어야 합니다: ${path}`);
    const existing = (await readFile(path, "utf8")).trim();
    if (!existing) throw new Error(`비밀값 파일이 비어 있습니다: ${path}`);
    await chmod(path, 0o600);
    return existing;
  }
  const generated = randomBytes(24).toString("hex");
  try {
    await writeFile(path, `${generated}\n`, { flag: "wx", mode: 0o600 });
    await chmod(path, 0o600);
    return generated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error(`비밀값 파일은 일반 파일이어야 합니다: ${path}`);
    const existing = (await readFile(path, "utf8")).trim();
    if (!existing) throw new Error(`비밀값 파일이 비어 있습니다: ${path}`);
    await chmod(path, 0o600);
    return existing;
  }
}

function forceKillPostgres() {
  if (process.platform !== "win32") return;
  if (postgresPid)
    spawnSync("taskkill", ["/pid", String(postgresPid), "/t", "/f"], {
      windowsHide: true,
      stdio: "ignore",
    });
  if (postgresDirectory) {
    const script =
      "$directory = $env:E2E_POSTGRES_DIR.Replace([char]92, [char]47); $workspace = $env:E2E_WORKSPACE_DIR.Replace([char]92, [char]47); $processes = Get-CimInstance Win32_Process -Filter \"Name = 'postgres.exe'\" | Where-Object { if (-not $_.CommandLine) { return $false }; $command = $_.CommandLine.Replace([char]92, [char]47); $command.Contains($directory, [StringComparison]::OrdinalIgnoreCase) -or ($workspace -and $command.Contains($workspace, [StringComparison]::OrdinalIgnoreCase) -and $command.Contains('@embedded-postgres', [StringComparison]::OrdinalIgnoreCase)) }; $processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    spawnSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      {
        env: {
          ...process.env,
          E2E_POSTGRES_DIR: postgresDirectory,
          E2E_WORKSPACE_DIR: workspaceDirectory,
        },
        windowsHide: true,
        stdio: "ignore",
      },
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
  const parsePort = (name: string, fallback: number, allowZero = false) => {
    const port = Number(process.env[name] ?? fallback);
    if (!Number.isInteger(port) || port < (allowZero ? 0 : 1) || port > 65535)
      throw new Error(`${name} must be an integer between 1 and 65535.`);
    return port;
  };
  const e2eDatabasePort = parsePort("E2E_DATABASE_PORT", 55433);
  const e2ePort = parsePort("E2E_PORT", 3100);
  if (e2eDatabasePort === e2ePort)
    throw new Error("E2E_DATABASE_PORT and E2E_PORT must be different.");
  const e2eAiMockPort = Number(process.env.E2E_AI_MOCK_PORT ?? 0);
  if (
    !Number.isInteger(e2eAiMockPort) ||
    e2eAiMockPort < 0 ||
    e2eAiMockPort > 65535
  )
    throw new Error("E2E_AI_MOCK_PORT must be an integer between 0 and 65535.");
  const databaseDir = resolve(
    process.env.E2E_DATABASE_DIR ?? ".local/e2e-postgres-v2",
  );
  await mkdir(resolve(databaseDir, ".."), { recursive: true });
  const databasePassword = await readOrCreateSecret(`${databaseDir}.password`);
  postgresDirectory = databaseDir;
  pg = new EmbeddedPostgres({
    databaseDir,
    port: e2eDatabasePort,
    user: "school",
    password: databasePassword,
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
    DATABASE_URL: `postgresql://school:${databasePassword}@localhost:${e2eDatabasePort}/school_e2e?schema=public`,
    AUTH_SECRET: randomBytes(32).toString("hex"),
    NODE_ENV: "test",
    APP_URL: `http://localhost:${e2ePort}`,
    TRUST_PROXY: "false",
    SERVER_ACTION_ALLOWED_ORIGINS: "",
    AI_API_KEY: randomBytes(24).toString("hex"),
    AI_BASE_URL: "",
    AI_MODEL: "test-fixture",
    AI_ALLOW_INSECURE_HTTP_LOCALHOST: "true",
    E2E_TEST_MODE: "true",
  };
  // Deterministic test provider only; production code has no mock switch.
  mock = createServer(async (req, res) => {
    if (req.url !== "/v1/chat/completions") {
      res.writeHead(404).end();
      return;
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1_000_000) {
        res.writeHead(413).end();
        return;
      }
    }
    let payload: { messages: { role: string; content: string }[] };
    try {
      payload = JSON.parse(body) as {
        messages: { role: string; content: string }[];
      };
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (
      !Array.isArray(payload.messages) ||
      payload.messages.length === 0 ||
      !payload.messages.every(
        (message) =>
          message &&
          typeof message.role === "string" &&
          typeof message.content === "string",
      )
    ) {
      res.writeHead(400).end();
      return;
    }
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
    mock?.listen(e2eAiMockPort, "127.0.0.1", () => done());
  });
  const address = mock?.address();
  if (!address || typeof address === "string")
    throw new Error("AI fixture failed to bind a TCP port.");
  env.AI_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
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
    ["node_modules/next/dist/bin/next", "start", "-p", String(e2ePort)],
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
