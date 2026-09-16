import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

async function readOrCreateSecret(path: string) {
  if (existsSync(path)) return (await readFile(path, "utf8")).trim();
  const generated = randomBytes(24).toString("hex");
  try {
    await writeFile(path, `${generated}\n`, { flag: "wx", mode: 0o600 });
    return generated;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return (await readFile(path, "utf8")).trim();
  }
}

async function main() {
  const databaseDir = resolve(".local/postgres");
  await mkdir(resolve(".local"), { recursive: true });
  const envPath = resolve(".env");
  const passwordPath = resolve(".local/postgres-password");
  let databasePassword = "";
  if (existsSync(envPath)) {
    const currentEnv = await readFile(envPath, "utf8");
    const match = currentEnv.match(
      /^DATABASE_URL=["']?postgres(?:ql)?:\/\/[^:@\s]+:([^@"'\s]+)@/m,
    );
    if (match) {
      try {
        databasePassword = decodeURIComponent(match[1]);
      } catch {
        databasePassword = match[1];
      }
    }
  }
  if (!databasePassword)
    databasePassword = await readOrCreateSecret(passwordPath);
  else if (!existsSync(passwordPath))
    await writeFile(passwordPath, `${databasePassword}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  if (!existsSync(".env"))
    await writeFile(
      ".env",
      `DATABASE_URL="postgresql://school:${databasePassword}@localhost:5432/school_os?schema=public"\nAUTH_SECRET="${randomBytes(32).toString("hex")}"\nAPP_URL="http://localhost:3000"\nTRUST_PROXY="false"\nSERVER_ACTION_ALLOWED_ORIGINS=""\nTEACHER_INVITE_CODE=""\nAI_API_KEY=""\nAI_BASE_URL="https://api.openai.com/v1"\nAI_MODEL=""\n`,
      { flag: "wx" },
    );
  const pg = new EmbeddedPostgres({
    databaseDir,
    port: 5432,
    user: "school",
    password: databasePassword,
    authMethod: "scram-sha-256",
    persistent: true,
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
    "SELECT 1 FROM pg_database WHERE datname = 'school_os'",
  );
  await client.end();
  if (!result.rowCount) await pg.createDatabase("school_os");
  console.log(
    "개발용 PostgreSQL 준비 완료: localhost:5432/school_os\n이 터미널을 열어 두세요. 다른 터미널에서 npm run db:deploy → npm run db:seed → npm run dev",
  );
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
