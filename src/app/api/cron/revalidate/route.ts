import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TAGS } from "@/lib/data";
import { serverEnv } from "@/lib/env.server";

/**
 * Refreshes every cached page and content read. For changes made directly in
 * the database (deleting the SAMPLE content at launch, a fix in the SQL
 * editor), which the admin's own saves would otherwise have expired.
 * POST with the cron secret; see docs/RUNBOOK.md.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  for (const tag of Object.values(TAGS)) if (typeof tag === "string") revalidateTag(tag, "max");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
