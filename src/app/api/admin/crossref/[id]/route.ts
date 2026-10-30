import { NextResponse, connection, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { crossrefDeposit, suggestDoi } from "@/lib/crossref";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { userClient } from "@/lib/supabase/clients";

/**
 * Crossref deposit XML for one issue (editors). Articles without a DOI get
 * the suggested one from Settings → DOI prefix; nothing is sent to Crossref.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const viewer = await getViewer();
  if (!viewer || !["super_admin", "editor"].includes(viewer.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const settings = await getSettings();
  if (!settings.doiPrefix)
    return NextResponse.json(
      { error: "no_doi_prefix", message: "Set the DOI prefix in Settings first." },
      { status: 409 },
    );
  const db = await userClient();
  const { data: issue } = await db
    .from("issues")
    .select("id, number, month, published_at, volume:volumes ( number, year )")
    .eq("id", id)
    .maybeSingle();
  if (!issue) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const v = issue.volume as unknown as { number: number; year: number };
  const { data: articles } = await db
    .from("articles")
    .select(
      "id, title, slug, doi, abstract, first_page, last_page, published_at, online_at, authors:article_authors ( name, affiliation, orcid, position )",
    )
    .eq("issue_id", id)
    .is("deleted_at", null)
    .order("sort_order");
  const now = new Date();
  const xml = crossrefDeposit({
    journal: { title: settings.journalName, abbrev: settings.shortName, issn: settings.issn, eissn: settings.eissn },
    volume: v.number,
    issue: issue.number,
    year: v.year,
    month: issue.month,
    depositor: { name: `${settings.shortName} Editorial Office`, email: settings.contactEmail },
    registrant: settings.publisher,
    batchId: `jhts-v${v.number}n${issue.number}-${now.getTime()}`,
    timestamp: now.toISOString().replace(/\D/g, "").slice(0, 14),
    articles: (articles ?? []).map((a, i) => ({
      title: a.title,
      authors: (a.authors as { name: string; affiliation: string | null; orcid: string | null; position: number }[])
        .sort((x, y) => x.position - y.position)
        .map(({ name, affiliation, orcid }) => ({ name, affiliation, orcid })),
      doi: a.doi ?? suggestDoi(settings.doiPrefix!, v.year, v.number, issue.number, i + 1),
      url: `${siteUrl}/articles/${a.slug}`,
      firstPage: a.first_page,
      lastPage: a.last_page,
      published: (a.published_at ?? issue.published_at ?? a.online_at ?? now.toISOString()).slice(0, 10),
      abstract: a.abstract,
    })),
  });
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="JHTS_Vol${v.number}_No${issue.number}_${v.year}_crossref.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
