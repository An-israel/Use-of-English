import "server-only";
import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { issuePath } from "@/lib/issues";
import type { ArticleSummary, IssueSummary } from "@/lib/types";

/**
 * The public read-only API (item 102): stable JSON shapes under /api/v1,
 * separate from internal routes, cacheable at the edge and open to any origin.
 * A breaking change means /api/v2, never an edit to v1.
 */
export const API_VERSION = "1";

export function json(body: unknown, maxAge = 300) {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge * 4}, stale-while-revalidate=86400`,
      "X-API-Version": API_VERSION,
    },
  });
}

export function articleJson(a: ArticleSummary) {
  return {
    id: a.id,
    slug: a.slug,
    url: `${siteUrl}/articles/${a.slug}`,
    type: a.type,
    title: a.title,
    authors: a.authors.map((x) => ({ name: x.name, affiliation: x.affiliation, orcid: x.orcid })),
    abstract: a.abstract,
    doi: a.doi,
    pages: a.firstPage ? { first: a.firstPage, last: a.lastPage } : null,
    issue: a.issue ? { volume: a.issue.volume, number: a.issue.number, year: a.issue.year } : null,
    in_press: !a.issue,
    online_at: a.onlineAt,
    published_at: a.publishedAt,
    pdf: a.hasPdf ? `${siteUrl}/api/download/article/${a.id}?format=pdf` : null,
    licence: "CC BY 4.0",
  };
}

export function issueJson(i: IssueSummary) {
  return {
    id: i.id,
    volume: i.volume,
    number: i.number,
    year: i.year,
    month: i.month,
    title: i.title,
    url: `${siteUrl}${issuePath(i)}`,
    published_at: i.publishedAt,
    cover: i.coverUrl,
  };
}
