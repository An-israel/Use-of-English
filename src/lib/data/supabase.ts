import "server-only";
import { categories as seedCategories, featureFlags as seedFlags, settings as seedSettings } from "@/content/journal";
import { publicEnv } from "@/lib/env";
import { publicClient } from "@/lib/supabase/clients";
import type {
  Article,
  ArticleSummary,
  BoardMember,
  Category,
  FeatureFlags,
  IssueSummary,
  Page,
  SiteSettings,
} from "@/lib/types";
import { SEARCH_PAGE_SIZE, type ContentSource } from "./source";
import { sanitize } from "@/lib/sanitize";

/**
 * Content source backed by Supabase (anonymous client, RLS applies).
 * Queries select only the columns they need and load authors, categories and
 * issues with nested selects, never per-article round trips (items 26–27).
 */

export function storageUrl(bucket: "covers" | "published", path: string | null | undefined): string | null {
  if (!path) return null;
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

const ARTICLE_SUMMARY_COLUMNS = `
  id, slug, type, title, abstract, first_page, last_page, doi, online_at, published_at,
  pdf_path, docx_path, view_count, download_count, is_sample, sort_order,
  category:categories ( slug ),
  issue:issues ( number, month, volume:volumes ( number, year ) ),
  authors:article_authors ( name, affiliation, orcid, is_corresponding, position )
`;

type Row = Record<string, unknown>;

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

function mapSummary(r: Row): ArticleSummary {
  const issue = r.issue as { number: number; month: number; volume: { number: number; year: number } } | null;
  const authors = ((r.authors as Row[]) ?? []).toSorted((a, b) => Number(a.position) - Number(b.position));
  return {
    id: r.id as string,
    slug: r.slug as string,
    type: r.type as ArticleSummary["type"],
    title: r.title as string,
    authors: authors.map((a) => ({
      name: a.name as string,
      affiliation: (a.affiliation as string) ?? null,
      orcid: (a.orcid as string) ?? null,
      isCorresponding: Boolean(a.is_corresponding),
    })),
    categorySlug: (r.category as { slug: string } | null)?.slug ?? null,
    firstPage: (r.first_page as number) ?? null,
    lastPage: (r.last_page as number) ?? null,
    doi: (r.doi as string) ?? null,
    onlineAt: (r.online_at as string) ?? null,
    publishedAt: (r.published_at as string) ?? null,
    issue: issue
      ? { volume: issue.volume.number, year: issue.volume.year, number: issue.number, month: issue.month }
      : null,
    abstract: (r.abstract as string) ?? "",
    hasPdf: Boolean(r.pdf_path),
    hasDocx: Boolean(r.docx_path),
    viewCount: Number(r.view_count ?? 0),
    downloadCount: Number(r.download_count ?? 0),
    isSample: Boolean(r.is_sample),
  };
}

function mapIssue(r: Row): IssueSummary {
  const volume = r.volume as { number: number; year: number };
  return {
    id: r.id as string,
    volume: volume.number,
    year: volume.year,
    number: r.number as number,
    month: r.month as number,
    title: (r.title as string) ?? null,
    coverUrl: storageUrl("covers", r.cover_path as string | null),
    publishedAt: (r.published_at as string) ?? null,
    isSample: Boolean(r.is_sample),
  };
}

function mapPage(r: Row): Page {
  return {
    kind: r.kind as Page["kind"],
    slug: r.slug as string,
    title: r.title as string,
    summary: (r.summary as string) ?? null,
    bodyHtml: r.body_html as string,
    sortOrder: r.sort_order as number,
    updatedAt: r.updated_at as string,
  };
}

export const supabaseSource: ContentSource = {
  async settings() {
    const rows = must(await publicClient().from("site_settings").select("key, value"));
    const merged: Record<string, unknown> = { ...seedSettings };
    for (const row of rows) merged[row.key] = row.value;
    return merged as SiteSettings;
  },

  async flags() {
    const rows = must(await publicClient().from("feature_flags").select("key, enabled"));
    const flags: Record<string, boolean> = { ...seedFlags };
    for (const row of rows) flags[row.key] = row.enabled;
    return flags as FeatureFlags;
  },

  async categories() {
    const rows = must(
      await publicClient()
        .from("categories")
        .select("id, name, slug, short_description, description, thread_color, sort_order")
        .order("sort_order"),
    );
    if (rows.length === 0) return seedCategories;
    return rows.map((r): Category => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      shortDescription: r.short_description,
      description: r.description,
      threadColor: r.thread_color,
      sortOrder: r.sort_order,
    }));
  },

  async board() {
    const rows = must(
      await publicClient()
        .from("editorial_board_members")
        .select("id, group, name, title, affiliation, photo_path, orcid, profile_url, term_start, term_end, sort_order")
        .is("deleted_at", null)
        .order("sort_order"),
    );
    return rows.map((r): BoardMember => ({
      id: r.id,
      group: r.group,
      name: r.name,
      title: r.title,
      affiliation: r.affiliation,
      photoUrl: storageUrl("covers", r.photo_path),
      orcid: r.orcid,
      profileUrl: r.profile_url,
      termStart: r.term_start,
      termEnd: r.term_end,
      sortOrder: r.sort_order,
    }));
  },

  async pages(kind) {
    const rows = must(
      await publicClient()
        .from("pages")
        .select("kind, slug, title, summary, body_html, sort_order, updated_at")
        .eq("kind", kind)
        .order("sort_order"),
    );
    return rows.map(mapPage);
  },

  async page(kind, slug) {
    const row = must(
      await publicClient()
        .from("pages")
        .select("kind, slug, title, summary, body_html, sort_order, updated_at")
        .eq("kind", kind)
        .eq("slug", slug)
        .maybeSingle(),
    );
    return row ? mapPage(row) : null;
  },

  async callForPapers() {
    const r: Row | null = must(
      await publicClient()
        .from("call_for_papers")
        .select("title, target_label, summary_html, banner_text, submission_deadline, review_period, publication_month")
        .eq("is_active", true)
        .maybeSingle(),
    );
    if (!r) return null;
    return {
      title: r.title as string,
      targetLabel: r.target_label as string,
      summaryHtml: r.summary_html as string,
      bannerText: r.banner_text as string,
      submissionDeadline: r.submission_deadline as string,
      reviewPeriod: (r.review_period as string) ?? null,
      publicationMonth: (r.publication_month as string) ?? null,
    };
  },

  async issues() {
    const rows = must(
      await publicClient()
        .from("issues")
        .select("id, number, month, title, cover_path, published_at, is_sample, volume:volumes!inner ( number, year )")
        .order("published_at", { ascending: false }),
    );
    return (rows as Row[]).map(mapIssue).toSorted((a, b) => b.volume - a.volume || b.number - a.number);
  },

  async issue(volume, number) {
    const r = must(
      await publicClient()
        .from("issues")
        .select(
          `id, number, month, title, cover_path, published_at, is_sample, editorial, full_pdf_path, full_docx_path,
           volume:volumes!inner ( number, year ),
           articles ( ${ARTICLE_SUMMARY_COLUMNS} )`,
        )
        .eq("volume.number", volume)
        .eq("number", number)
        .maybeSingle(),
    );
    if (!r) return null;
    const row = r as Row;
    return {
      ...mapIssue(row),
      editorialHtml: (row.editorial as string) ?? null,
      fullPdfUrl: row.full_pdf_path ? `/api/download/issue/${row.id}?format=pdf` : null,
      fullDocxUrl: row.full_docx_path ? `/api/download/issue/${row.id}?format=docx` : null,
      articles: ((row.articles as Row[]) ?? [])
        .toSorted((a, b) => Number(a.sort_order) - Number(b.sort_order))
        .map(mapSummary),
    };
  },

  async inPress() {
    const rows = must(
      await publicClient()
        .from("articles")
        .select(ARTICLE_SUMMARY_COLUMNS)
        .eq("status", "in_press")
        .order("online_at", { ascending: false }),
    );
    return (rows as Row[]).map(mapSummary);
  },

  async article(slug) {
    const r = must(
      await publicClient()
        .from("articles")
        .select(
          `${ARTICLE_SUMMARY_COLUMNS}, keywords, body_html, citation_style, licence, received_at, accepted_at, status,
           book:book_reviews ( book_title, book_author, publisher, year, isbn, pages, book_cover_path )`,
        )
        .eq("slug", slug)
        .maybeSingle(),
    );
    if (!r) return null;
    const row = r as Row;
    const book = row.book as Row | null;
    return {
      ...mapSummary(row),
      keywords: (row.keywords as string[]) ?? [],
      bodyHtml: (row.body_html as string) ?? null,
      citationStyle: (row.citation_style as Article["citationStyle"]) ?? null,
      licence: row.licence as string,
      receivedAt: (row.received_at as string) ?? null,
      acceptedAt: (row.accepted_at as string) ?? null,
      status: row.status as Article["status"],
      bookReview: book
        ? {
            bookTitle: book.book_title as string,
            bookAuthor: book.book_author as string,
            publisher: (book.publisher as string) ?? null,
            year: (book.year as number) ?? null,
            isbn: (book.isbn as string) ?? null,
            pages: (book.pages as number) ?? null,
            coverUrl: storageUrl("covers", book.book_cover_path as string | null),
          }
        : null,
    };
  },

  async articles() {
    const rows = must(
      await publicClient().from("articles").select(ARTICLE_SUMMARY_COLUMNS).order("online_at", { ascending: false }),
    );
    return (rows as Row[]).map(mapSummary);
  },

  async search(p) {
    const page = Math.max(1, p.page ?? 1);
    const rows: { id: string; title_html: string; snippet_html: string; total: number }[] = must(
      await publicClient().rpc("search_articles", {
        p_query: p.q ?? "",
        p_year: p.year ?? null,
        p_volume: p.volume ?? null,
        p_issue: p.issue ?? null,
        p_category: p.category ?? null,
        p_type: p.type ?? null,
        p_author: p.author ?? null,
        p_limit: SEARCH_PAGE_SIZE,
        p_offset: (page - 1) * SEARCH_PAGE_SIZE,
      }),
    );
    if (rows.length === 0) return { total: 0, hits: [] };
    const full: Row[] = must(
      await publicClient()
        .from("articles")
        .select(ARTICLE_SUMMARY_COLUMNS)
        .in(
          "id",
          rows.map((r) => r.id),
        ),
    );
    const byId = new Map(full.map((r) => [r.id as string, mapSummary(r)]));
    return {
      total: Number(rows[0].total),
      hits: rows
        .filter((r) => byId.has(r.id))
        .map((r) => ({
          article: byId.get(r.id)!,
          // ts_headline only adds <mark>; sanitise anyway since titles are editor input
          titleHtml: sanitize(r.title_html),
          snippetHtml: sanitize(r.snippet_html),
        })),
    };
  },

  async slugRedirect(entity, slug) {
    const r: { new_slug: string } | null = must(
      await publicClient()
        .from("slug_redirects")
        .select("new_slug")
        .eq("entity", entity)
        .eq("old_slug", slug)
        .maybeSingle(),
    );
    return r?.new_slug ?? null;
  },
};
