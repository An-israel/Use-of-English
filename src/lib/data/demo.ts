import "server-only";
import { BOARD_TERM, board, callForPapers, categories, featureFlags, settings } from "@/content/journal";
import { pages, policies } from "@/content/pages";
import { sampleInPress, sampleIssues, type SampleArticle, type SampleIssue } from "@/content/samples";
import { stableUuid } from "@/lib/ids";
import type { Article, ArticleSummary, BoardMember, IssueSummary } from "@/lib/types";
import { SEARCH_PAGE_SIZE, type ContentSource, type IssueWithArticles, type SearchHit } from "./source";

/** Content source backed by the seed files: used when Supabase is not configured. */

const issueSummary = (i: SampleIssue): IssueSummary => ({
  id: stableUuid(`issue:${i.volume}:${i.number}`),
  volume: i.volume,
  year: i.year,
  number: i.number,
  month: i.month,
  title: null,
  coverUrl: null,
  publishedAt: i.publishedAt,
  isSample: true,
});

function toArticle(a: SampleArticle, issue: SampleIssue | null, onlineAt: string): Article {
  const published = new Date(onlineAt);
  const day = (n: number) => new Date(published.getTime() - n * 864e5).toISOString().slice(0, 10);
  return {
    id: stableUuid(`article:${a.slug}`),
    slug: a.slug,
    type: a.type,
    title: a.title,
    authors: a.authors.map((au) => ({
      name: au.name,
      affiliation: au.affiliation,
      orcid: au.orcid ?? null,
      isCorresponding: Boolean(au.corresponding),
    })),
    categorySlug: a.category,
    firstPage: a.pages?.[0] ?? null,
    lastPage: a.pages?.[1] ?? null,
    doi: null,
    onlineAt,
    publishedAt: issue ? issue.publishedAt : null,
    issue: issue ? { volume: issue.volume, number: issue.number, month: issue.month, year: issue.year } : null,
    abstract: a.abstract,
    hasPdf: false,
    pdfUrl: null,
    hasDocx: false,
    viewCount: a.views,
    downloadCount: a.downloads,
    isSample: true,
    keywords: a.keywords,
    bodyHtml: a.bodyHtml ?? null,
    citationStyle: a.citationStyle,
    licence: settings.licence.name,
    receivedAt: day(120),
    acceptedAt: day(40),
    status: issue ? "published" : "in_press",
    bookReview: a.book
      ? {
          bookTitle: a.book.title,
          bookAuthor: a.book.author,
          publisher: a.book.publisher,
          year: a.book.year,
          isbn: a.book.isbn,
          pages: a.book.pages,
          coverUrl: null,
        }
      : null,
  };
}

const allArticles: Article[] = [
  ...sampleIssues.flatMap((i) => i.articles.map((a) => toArticle(a, i, i.publishedAt))),
  ...sampleInPress.map((a) => toArticle(a, null, a.onlineAt)),
];

const summary = ({
  keywords,
  bodyHtml,
  citationStyle,
  licence,
  receivedAt,
  acceptedAt,
  status,
  bookReview,
  ...rest
}: Article): ArticleSummary => {
  void [keywords, bodyHtml, citationStyle, licence, receivedAt, acceptedAt, status, bookReview];
  return rest;
};

const boardMembers: BoardMember[] = board.map((m, i) => ({
  id: stableUuid(`board:${m.name}`),
  group: m.group,
  name: m.name,
  title: null,
  affiliation: m.affiliation,
  photoUrl: null,
  orcid: null,
  profileUrl: null,
  termStart: BOARD_TERM.start,
  termEnd: BOARD_TERM.end,
  sortOrder: i,
}));

export const demoSource: ContentSource = {
  async settings() {
    return settings;
  },
  async flags() {
    return featureFlags;
  },
  async categories() {
    return categories;
  },
  async board() {
    return boardMembers;
  },
  async pages(kind) {
    return (kind === "page" ? pages : policies).toSorted((a, b) => a.sortOrder - b.sortOrder);
  },
  async page(kind, slug) {
    return (kind === "page" ? pages : policies).find((p) => p.slug === slug) ?? null;
  },
  async callForPapers() {
    return callForPapers;
  },
  async issues() {
    return sampleIssues.map(issueSummary).toSorted((a, b) => b.volume - a.volume || b.number - a.number);
  },
  async issue(volume, number): Promise<IssueWithArticles | null> {
    const i = sampleIssues.find((x) => x.volume === volume && x.number === number);
    if (!i) return null;
    return {
      ...issueSummary(i),
      editorialHtml: i.editorial,
      fullPdfUrl: null,
      fullDocxUrl: null,
      articles: allArticles.filter((a) => a.issue?.volume === volume && a.issue.number === number).map(summary),
    };
  },
  async inPress() {
    return allArticles
      .filter((a) => a.status === "in_press")
      .toSorted((a, b) => (b.onlineAt ?? "").localeCompare(a.onlineAt ?? ""))
      .map(summary);
  },
  async article(slug) {
    return allArticles.find((a) => a.slug === slug) ?? null;
  },
  async articles() {
    return allArticles.toSorted((a, b) => (b.onlineAt ?? "").localeCompare(a.onlineAt ?? "")).map(summary);
  },
  async slugRedirect() {
    return null;
  },
  async search(p) {
    const norm = (x: string) =>
      x
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const terms = norm(p.q ?? "")
      .split(/\s+/)
      .filter((t) => t.length > 1)
      .map((t) => t.replace(/s$/, ""));
    const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const mark = (text: string) =>
      terms.length
        ? esc(text).replace(
            new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\w*`, "gi"),
            "<mark>$&</mark>",
          )
        : esc(text);
    const scored = allArticles
      .filter((a) => {
        const year = a.issue?.year ?? Number((a.onlineAt ?? "").slice(0, 4));
        return (
          (!p.year || year === p.year) &&
          (!p.volume || a.issue?.volume === p.volume) &&
          (!p.issue || a.issue?.number === p.issue) &&
          (!p.category || a.categorySlug === p.category) &&
          (!p.type || a.type === p.type) &&
          (!p.author || a.authors.some((x) => norm(x.name).includes(norm(p.author!))))
        );
      })
      .map((a) => {
        const title = norm(a.title);
        const meta = norm(`${a.keywords.join(" ")} ${a.authors.map((x) => x.name).join(" ")}`);
        const abs = norm(a.abstract);
        let score = 0;
        for (const t of terms) {
          const s = (title.includes(t) ? 4 : 0) + (meta.includes(t) ? 2 : 0) + (abs.includes(t) ? 1 : 0);
          if (!s) return { a, score: -1 };
          score += s;
        }
        return { a, score };
      })
      .filter((r) => r.score >= 0)
      .sort((x, y) => y.score - x.score || (y.a.onlineAt ?? "").localeCompare(x.a.onlineAt ?? ""));
    const page = Math.max(1, p.page ?? 1);
    const hits: SearchHit[] = scored.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE).map(({ a }) => ({
      article: summary(a),
      titleHtml: mark(a.title),
      snippetHtml: mark(a.abstract.length > 260 ? `${a.abstract.slice(0, 260)}…` : a.abstract),
    }));
    return { total: scored.length, hits };
  },
};
