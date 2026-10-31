import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverEnv } from "@/lib/env.server";
import { adminClient } from "@/lib/supabase/clients";

/**
 * The backup workflow reports each run here (item 84), so the System screen
 * shows the last backup and the daily check can alert when one fails or stops.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const parsed = z
    .object({
      status: z.enum(["ok", "failed"]),
      location: z.string().max(500).optional(),
      details: z.record(z.string(), z.unknown()).optional(),
      started_at: z.iso.datetime().optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  const r = parsed.data;
  const { error } = await adminClient()
    .from("backup_runs")
    .insert({
      status: r.status,
      location: r.location ?? null,
      details: r.details ?? {},
      started_at: r.started_at ?? new Date().toISOString(),
      finished_at: new Date().toISOString(),
    });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
