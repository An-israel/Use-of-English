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
}
