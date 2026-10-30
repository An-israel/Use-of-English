import { NextResponse, connection, type NextRequest } from "next/server";
import { handler } from "@/lib/api/handler";
import { RATE_LIMITS } from "@/lib/api/rate-limit";
import { getFlags, getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { issueLabelShort } from "@/lib/issues";
import { oai, type OaiRecord } from "@/lib/oai";
import { publicClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";

const COLUMNS =
  "id, slug, title, type, abstract, keywords, doi, published_at, online_at, updated_at, authors:article_authors ( name, position ), issue:issues ( number, volume:volumes ( number, year ) )";

type Row = {
  id: string;
  slug: string;
  title: string;
  type: ArticleType;
  abstract: string;
  keywords: string[];
  doi: string | null;
  published_at: string | null;
  online_at: string | null;
  updated_at: string;
  authors: { name: string; position: number }[];
  issue: { number: number; volume: { number: number; year: number } } | null;
};

/**
 * OAI-PMH endpoint (brief section 12) for indexes and aggregators. Behind the
 * oai_pmh feature flag, off until the committee wants it. Public articles only
 * (RLS on the anonymous client).
 */
async function respond(req: NextRequest) {
  await connection();
  const [flags, s] = await Promise.all([getFlags(), getSettings()]);
  if (!flags.oai_pmh) return NextResponse.json({ error: "not_enabled" }, { status: 404 });
  const params = req.method === "POST" ? new URLSearchParams(await req.text()) : req.nextUrl.searchParams;
  const db = publicClient();
  const map = (r: Row, journal: string): OaiRecord => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    creators: r.authors.sort((a, b) => a.position - b.position).map((a) => a.name),
    subjects: r.keywords,
    description: r.abstract,
    publisher: s.publisher,
    date: (r.published_at ?? r.online_at)?.slice(0, 10) ?? null,
    type: ARTICLE_TYPE_LABEL[r.type],
    doi: r.doi,
    source: r.issue
      ? `${journal}, ${issueLabelShort({ volume: r.issue.volume.number, number: r.issue.number, year: r.issue.volume.year })}`
      : `${journal}, Article in Press`,
    datestamp: r.updated_at.slice(0, 10),
  });
  const { data: first } = await db.from("articles").select("updated_at").order("updated_at").limit(1).maybeSingle();
  const xml = await oai(params, {
    baseUrl: `${siteUrl}/api/oai`,
    siteUrl,
    repositoryName: s.journalName,
    adminEmail: s.contactEmail.startsWith("[") ? "editorial@jhts.unn.edu.ng" : s.contactEmail,
    earliest: first?.updated_at.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    domain: s.domain,
    async list({ from, until, offset, limit }) {
      let q = db.from("articles").select(COLUMNS, { count: "exact" }).order("updated_at").order("id");
      if (from) q = q.gte("updated_at", `${from}T00:00:00Z`);
      if (until) q = q.lt("updated_at", new Date(Date.parse(`${until}T00:00:00Z`) + 86_400_000).toISOString());
      const { data, count, error } = await q.range(offset, offset + limit - 1).returns<Row[]>();
      if (error) throw new Error(error.message);
      return { records: (data ?? []).map((r) => map(r, s.journalName)), total: count ?? 0 };
    },
    async get(id) {
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const { data } = await db.from("articles").select(COLUMNS).eq("id", id).maybeSingle<Row>();
      return data ? map(data, s.journalName) : null;
    },
  });
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" } });
}

export const GET = handler(({ req }) => respond(req), { rateLimit: RATE_LIMITS.publicApi, cors: "public" });
// OAI-PMH also allows POST with form-encoded arguments; harvesters are other origins.
export const POST = handler(({ req }) => respond(req), {
  rateLimit: RATE_LIMITS.publicApi,
  cors: "public",
  checkOrigin: false,
});
