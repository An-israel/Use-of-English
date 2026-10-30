import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { kickJobs } from "@/lib/jobs/kick";
import { runDaily } from "@/lib/ops/maintenance";
import { adminClient } from "@/lib/supabase/clients";

/** Daily cron: reviewer reminders, orphan and draft clean-up, alerts. One run at a time (lease). */
export async function GET(req: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = adminClient();
  const holder = crypto.randomUUID();
  const { data: got } = await db.rpc("acquire_lease", { p_name: "daily", p_holder: holder, p_ttl_seconds: 600 });
  if (!got) return NextResponse.json({ ok: false, reason: "busy" }, { status: 409 });
  try {
    const result = await runDaily();
    kickJobs();
    await db.rpc("release_lease", { p_name: "daily", p_holder: holder, p_status: "ok" });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    await db.rpc("release_lease", { p_name: "daily", p_holder: holder, p_status: "error", p_error: String(err) });
    throw err;
  }
}
