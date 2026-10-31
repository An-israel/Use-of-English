import { NextResponse, after, connection } from "next/server";
import { ApiError, handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { downloadName } from "@/lib/downloads";
import { publicEnv } from "@/lib/env";
import { recordMetric } from "@/lib/metrics";
import { publicClient } from "@/lib/supabase/clients";
import { Id } from "@/lib/validation";

/**
 * /api/download/article/[id]?format=pdf|docx (brief section 9.3): counts the
 * download, then redirects to the file on the CDN under a clean name. Only
 * published articles and Articles in Press are served (RLS on articles).
 */
export const GET = handler<{ id: string }>(
  async ({ req, params }) => {
    await connection();
    const format = req.nextUrl.searchParams.get("format") === "docx" ? "docx" : "pdf";
    if (!Id.safeParse(params.id).success) throw new ApiError(404, "not_found", "No such article.");
    const { data: a } = await publicClient()
      .from("articles")
      .select(
        "id, pdf_path, docx_path, online_at, published_at, issue:issues ( number, volume:volumes ( number, year ) ), authors:article_authors ( name, position )",
      )
      .eq("id", params.id)
      .maybeSingle();
    if (!a) throw new ApiError(404, "not_found", "No such article.");
    const path = format === "pdf" ? a.pdf_path : a.docx_path;
    if (!path) throw new ApiError(404, "no_file", `This article has no ${format.toUpperCase()} file.`);
    const issue = a.issue as unknown as { number: number; volume: { number: number; year: number } } | null;
    const authors = (a.authors as { name: string; position: number }[]).sort((x, y) => x.position - y.position);
    const name = downloadName({
      format,
      issue: issue ? { volume: issue.volume.number, number: issue.number, year: issue.volume.year } : null,
      year: Number((a.online_at ?? a.published_at ?? new Date().toISOString()).slice(0, 4)),
      firstAuthor: authors[0]?.name,
    });
    const headers = new Headers(req.headers);
    after(() => recordMetric(headers, { kind: "download", articleId: a.id, format }));
    const url = `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/published/${path}?download=${encodeURIComponent(name)}`;
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
  },
  { rateLimit: RATE_LIMITS.download },
);
