import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env.server";
import { runReconciliation, yesterdayInLagos } from "@/lib/payments/reconcile-run";

/** Daily cron: reconcile yesterday (Lagos time) with Paystack, or ?date=YYYY-MM-DD. */
export async function GET(req: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date") ?? yesterdayInLagos();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ ok: false, error: "bad_date" }, { status: 400 });
  const result = await runReconciliation(date);
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.reason === "busy" ? 409 : 502,
    headers: { "Cache-Control": "no-store" },
  });
}
