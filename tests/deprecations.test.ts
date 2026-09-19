import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import assert from "node:assert/strict";

test("deprecated 점검은 허용되지 않은 lockfile 항목을 거부한다", () => {
  const directory = mkdtempSync(join(tmpdir(), "ai-school-os-deprecations-"));
  const lockfilePath = join(directory, "package-lock.json");
  try {
    writeFileSync(
      lockfilePath,
      JSON.stringify({
        packages: {
          "node_modules/example-package": {
            version: "1.0.0",
            deprecated: "upgrade required",
          },
        },
      }),
    );
    const result = spawnSync(
      process.execPath,
      [
        resolve("node_modules/tsx/dist/cli.mjs"),
        "scripts/check-deprecations.ts",
        lockfilePath,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /example-package@1\.0\.0/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
