import { NextResponse, after, connection } from "next/server";
import { ApiError, handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { downloadName } from "@/lib/downloads";
import { publicEnv } from "@/lib/env";
import { recordMetric } from "@/lib/metrics";
import { publicClient } from "@/lib/supabase/clients";
import { Id } from "@/lib/validation";

/** /api/download/issue/[id]?format=pdf|docx: the full issue, counted, under a clean name. Published issues only. */
export const GET = handler<{ id: string }>(
  async ({ req, params }) => {
    await connection();
    const format = req.nextUrl.searchParams.get("format") === "docx" ? "docx" : "pdf";
    if (!Id.safeParse(params.id).success) throw new ApiError(404, "not_found", "No such issue.");
    const { data: i } = await publicClient()
      .from("issues")
      .select("id, number, full_pdf_path, full_docx_path, volume:volumes ( number, year )")
      .eq("id", params.id)
      .maybeSingle();
    if (!i) throw new ApiError(404, "not_found", "No such issue.");
    const path = format === "pdf" ? i.full_pdf_path : i.full_docx_path;
    if (!path) throw new ApiError(404, "no_file", `This issue has no ${format.toUpperCase()} file.`);
    const v = i.volume as unknown as { number: number; year: number };
    const name = downloadName({ format, issue: { volume: v.number, number: i.number, year: v.year } });
    const headers = new Headers(req.headers);
    after(() => recordMetric(headers, { kind: "download", issueId: i.id, format }));
    const url = `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/published/${path}?download=${encodeURIComponent(name)}`;
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
  },
  { rateLimit: RATE_LIMITS.download },
);
