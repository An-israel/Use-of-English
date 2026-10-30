import { NextResponse, connection } from "next/server";
import { dependencyChecks } from "@/lib/health/checks";

/** Readiness: dependencies are reachable, so the instance can take traffic. */
export async function GET() {
  await connection();
  const checks = await dependencyChecks();
  const ready = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      checks: Object.fromEntries(Object.entries(checks).map(([k, v]) => [k, v.ok])),
    },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
