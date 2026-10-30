import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { runJobs } from "@/lib/jobs/worker";
import { adminClient } from "@/lib/supabase/clients";

/** Vercel Cron: process the job queue and expire stale pending payments. */
export async function GET(req: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const [jobs, expired] = await Promise.all([runJobs(), adminClient().rpc("expire_stale_payments")]);
  return NextResponse.json(
    { ok: true, jobs, expiredPayments: expired.data ?? 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
