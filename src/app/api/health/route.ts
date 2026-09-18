import { aiConfigured } from "@/lib/ai";
import { db } from "@/lib/db";
import { getRuntimeConfig } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function notReady(failed: "configuration" | "database") {
  return Response.json(
    {
      status: "not_ready",
      checks: {
        configuration: failed === "configuration" ? "failed" : "not_checked",
        database: failed === "database" ? "failed" : "not_checked",
      },
    },
    { status: 503, headers },
  );
}

export async function GET() {
  try {
    getRuntimeConfig();
  } catch {
    return notReady("configuration");
  }

  try {
    await db.$queryRaw`SELECT 1`;
    await db.$queryRaw`SELECT "removedAt" FROM "ClassMember" LIMIT 0`;
  } catch {
    return notReady("database");
  }

  return Response.json(
    {
      status: "ok",
      checks: {
        configuration: "ok",
        database: "ok",
        ai: aiConfigured() ? "configured" : "disabled",
      },
      timestamp: new Date().toISOString(),
    },
    { headers },
  );
}
