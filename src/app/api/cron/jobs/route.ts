import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TAGS } from "@/lib/data";
import { serverEnv } from "@/lib/env.server";
import { runJobs } from "@/lib/jobs/worker";
import { adminClient } from "@/lib/supabase/clients";

/** Cron: process the job queue, publish scheduled issues and articles, expire stale pending payments. */
export async function GET(req: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const db = adminClient();
  const published = await db.rpc("publish_due");
  if ((published.data ?? 0) > 0) {
    revalidateTag(TAGS.issues, "max");
    revalidateTag(TAGS.articles, "max");
  }
  const [jobs, expired] = await Promise.all([runJobs(), db.rpc("expire_stale_payments")]);
  return NextResponse.json(
    { ok: true, jobs, published: published.data ?? 0, expiredPayments: expired.data ?? 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
