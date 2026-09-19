import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type LockPackage = {
  version?: unknown;
  deprecated?: unknown;
};

type Lockfile = {
  packages?: Record<string, LockPackage>;
};

type DeprecationFinding = {
  id: string;
  path: string;
  message: string;
};

const allowedDeprecations = new Set(["eslint@9.39.5"]);

function packageNameFromPath(packagePath: string): string | null {
  const segments = packagePath.split("/").filter(Boolean);
  const nodeModulesIndex = segments.lastIndexOf("node_modules");
  if (nodeModulesIndex === -1) return null;

  const packageStart = nodeModulesIndex + 1;
  const firstSegment = segments[packageStart];
  if (!firstSegment) return null;
  if (firstSegment.startsWith("@")) {
    const secondSegment = segments[packageStart + 1];
    return secondSegment ? `${firstSegment}/${secondSegment}` : null;
  }
  return firstSegment;
}

function findDeprecatedPackages(lockfile: Lockfile): DeprecationFinding[] {
  return Object.entries(lockfile.packages ?? []).flatMap(
    ([packagePath, packageInfo]) => {
      if (typeof packageInfo.deprecated !== "string") return [];
      if (typeof packageInfo.version !== "string") return [];
      const packageName = packageNameFromPath(packagePath);
      if (!packageName) return [];
      return [
        {
          id: `${packageName}@${packageInfo.version}`,
          path: packagePath,
          message: packageInfo.deprecated,
        },
      ];
    },
  );
}

function main() {
  const lockfilePath = resolve(process.argv[2] ?? "package-lock.json");
  const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8")) as Lockfile;
  const findings = findDeprecatedPackages(lockfile);
  const unexpectedFindings = findings.filter(
    (finding) => !allowedDeprecations.has(finding.id),
  );
  const allowedFindings = findings.filter((finding) =>
    allowedDeprecations.has(finding.id),
  );

  for (const finding of allowedFindings) {
    console.warn(
      `허용된 deprecated 예외: ${finding.id} (${finding.path})\n${finding.message}`,
    );
  }

  if (unexpectedFindings.length > 0) {
    console.error("허용되지 않은 deprecated 의존성이 발견되었습니다.");
    for (const finding of unexpectedFindings) {
      console.error(`- ${finding.id} (${finding.path})\n  ${finding.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `deprecated 의존성 점검 통과: ${findings.length}개 항목 중 허용된 예외 ${allowedFindings.length}개`,
  );
}

main();
