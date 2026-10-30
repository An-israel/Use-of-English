import { NextResponse, connection } from "next/server";
import { dependencyChecks } from "@/lib/health/checks";

/** Full health check for uptime monitors: 200 when healthy, 503 otherwise. */
export async function GET() {
  await connection();
  const checks = await dependencyChecks();
  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      time: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
      checks,
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
