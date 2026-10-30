import type {
  Article,
  ArticleSummary,
  BoardMember,
  CallForPapers,
  Category,
  FeatureFlags,
  Issue,
  IssueSummary,
  Page,
  SiteSettings,
} from "@/lib/types";

export type IssueWithArticles = Issue & { articles: ArticleSummary[] };

export type SearchParams = {
  q?: string;
  year?: number;
  volume?: number;
  issue?: number;
  category?: string;
  type?: ArticleSummary["type"];
  author?: string;
  page?: number;
};

export type SearchHit = { article: ArticleSummary; titleHtml: string; snippetHtml: string };
export type SearchResult = { total: number; hits: SearchHit[]; fuzzy?: boolean };

export const SEARCH_PAGE_SIZE = 10;

/** Read-only public content. Implemented by Supabase and by demo (seed) data. */
export interface ContentSource {
  settings(): Promise<SiteSettings>;
  flags(): Promise<FeatureFlags>;
  categories(): Promise<Category[]>;
  board(): Promise<BoardMember[]>;
  pages(kind: Page["kind"]): Promise<Page[]>;
  page(kind: Page["kind"], slug: string): Promise<Page | null>;
  callForPapers(): Promise<CallForPapers | null>;
  /** Published issues, newest first */
  issues(): Promise<IssueSummary[]>;
  issue(volume: number, number: number): Promise<IssueWithArticles | null>;
  inPress(): Promise<ArticleSummary[]>;
  article(slug: string): Promise<Article | null>;
  /** Published and in-press articles, newest first */
  articles(): Promise<ArticleSummary[]>;
  slugRedirect(entity: "article" | "category" | "page", slug: string): Promise<string | null>;
  search(params: SearchParams): Promise<SearchResult>;
}
