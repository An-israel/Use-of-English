import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CategoryChip } from "@/components/journal/CategoryChip";
import { EmptyState } from "@/components/journal/EmptyState";
import { PageHeader } from "@/components/journal/PageHeader";
import { Pagination } from "@/components/journal/Pagination";
import { SampleTag } from "@/components/journal/SampleTag";
import { Skeleton } from "@/components/journal/Skeleton";
import { SearchIcon } from "@/components/ui/icons";
import { getCategories, getIssues, searchArticles } from "@/lib/data";
import { SEARCH_PAGE_SIZE, type SearchParams } from "@/lib/data/source";
import { formatDate } from "@/lib/format";
import { issueLabelShort } from "@/lib/issues";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";

export const metadata: Metadata = {
  title: "Search",
  description: "Search articles, reviews and authors in the Journal of Humanities and Transcultural Studies.",
  robots: { index: false, follow: true },
};

type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const int = (v: string | undefined) => (v && /^\d{1,4}$/.test(v) ? Number(v) : undefined);
const TYPES = Object.keys(ARTICLE_TYPE_LABEL) as ArticleType[];

function parse(raw: Raw): SearchParams {
  const [vol, iss] = (one(raw.issue) ?? "").split("-");
  const type = one(raw.type);
  return {
    q: one(raw.q)?.slice(0, 200),
    year: int(one(raw.year)),
    volume: int(vol),
    issue: int(iss),
    category: one(raw.category)?.slice(0, 80),
    type: TYPES.includes(type as ArticleType) ? (type as ArticleType) : undefined,
    author: one(raw.author)?.slice(0, 120),
    page: int(one(raw.page)) ?? 1,
  };
}

export default function SearchPage({ searchParams }: { searchParams: Promise<Raw> }) {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Search" }]}
        eyebrow="Search the journal"
        title="Search"
        seed={29}
      />
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="max-w-page mx-auto px-4 py-12 sm:px-6 lg:px-10" role="status" aria-label="Loading results">
      <Skeleton className="h-14 w-full max-w-[44rem]" />
      <div className="mt-10 space-y-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    </div>
  );
}

async function SearchContent({ searchParams }: { searchParams: Promise<Raw> }) {
  const params = parse(await searchParams);
  const [categories, issues] = await Promise.all([getCategories(), getIssues()]);
  const hasQuery = Boolean(params.q || params.year || params.volume || params.category || params.type || params.author);
  const result = hasQuery ? await searchArticles(params) : { total: 0, hits: [] };
  const byslug = new Map(categories.map((c) => [c.slug, c]));
  const years = [...new Set(issues.map((i) => i.year))].sort((a, b) => b - a);
  const pages = Math.ceil(result.total / SEARCH_PAGE_SIZE);

  const href = (page: number) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.year) sp.set("year", String(params.year));
    if (params.volume && params.issue) sp.set("issue", `${params.volume}-${params.issue}`);
    if (params.category) sp.set("category", params.category);
    if (params.type) sp.set("type", params.type);
    if (params.author) sp.set("author", params.author);
    if (page > 1) sp.set("page", String(page));
    return `/search?${sp}`;
  };

  const field = "w-full rounded-sm border border-rule bg-surface px-3 py-2.5 text-[0.92rem] text-fg";

  return (
    <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-10 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <form
        action="/search"
        method="get"
        role="search"
        className="group/form col-span-12 lg:col-span-3"
        aria-label="Search the journal"
      >
        <div className="space-y-5 lg:sticky lg:top-24">
          <label className="block">
            <span className="smallcaps text-muted text-[0.78rem]">Search terms</span>
            <span className="border-fg/70 bg-surface focus-within:outline-thread mt-1.5 flex items-center gap-2 rounded-sm border px-3 focus-within:outline-2 focus-within:outline-offset-2">
              <SearchIcon className="text-muted shrink-0" />
              <input
                name="q"
                type="search"
                defaultValue={params.q}
                placeholder="Title, keyword, abstract"
                className="h-12 w-full bg-transparent outline-none"
              />
            </span>
          </label>
          <label className="block">
            <span className="smallcaps text-muted text-[0.78rem]">Author</span>
            <input name="author" defaultValue={params.author} placeholder="e.g. Okafor" className={`${field} mt-1.5`} />
          </label>
          <details
            className="group/f lg:hidden"
            open={Boolean(params.year || params.volume || params.category || params.type)}
          >
            <summary className="text-brand inline-flex cursor-pointer list-none items-center gap-2 text-[0.92rem] [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="inline-block size-[0.42rem] rotate-45 border border-current group-open/f:bg-current"
              />
              Filters
            </summary>
          </details>
          <div className="hidden grid-cols-2 gap-3 group-has-[details[open]]/form:grid lg:grid lg:grid-cols-1">
            <label className="block">
              <span className="smallcaps text-muted text-[0.78rem]">Year</span>
              <select name="year" defaultValue={params.year ?? ""} className={`${field} mt-1.5`}>
                <option value="">Any year</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="smallcaps text-muted text-[0.78rem]">Issue</span>
              <select
                name="issue"
                defaultValue={params.volume && params.issue ? `${params.volume}-${params.issue}` : ""}
                className={`${field} mt-1.5`}
              >
                <option value="">Any issue</option>
                {issues.map((i) => (
                  <option key={i.id} value={`${i.volume}-${i.number}`}>
                    {issueLabelShort(i)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="smallcaps text-muted text-[0.78rem]">Subject</span>
              <select name="category" defaultValue={params.category ?? ""} className={`${field} mt-1.5`}>
                <option value="">Any subject</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="smallcaps text-muted text-[0.78rem]">Type</span>
              <select name="type" defaultValue={params.type ?? ""} className={`${field} mt-1.5`}>
                <option value="">Any type</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ARTICLE_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-5 py-3 font-medium"
            >
              Search
            </button>
            {hasQuery && (
              <Link
                href="/search"
                className="text-muted decoration-rule hover:text-fg text-[0.9rem] underline underline-offset-4"
              >
                Clear
              </Link>
            )}
          </div>
        </div>
      </form>

      <section aria-labelledby="results-title" className="col-span-12 lg:col-span-8 lg:col-start-5">
        <h2 id="results-title" className="sr-only">
          Results
        </h2>
        {!hasQuery ? (
          <EmptyState title="What are you looking for?">
            Search titles, abstracts, keywords and author names. Tip: press{" "}
            <kbd className="border-rule rounded-[3px] border px-1.5 text-[0.8rem]">Ctrl K</kbd> anywhere for instant
            results.
          </EmptyState>
        ) : result.total === 0 ? (
          <EmptyState title="No matches">
            Nothing matched{params.q ? <> “{params.q}”</> : null}. Check the spelling, use fewer words, or remove a
            filter.
          </EmptyState>
        ) : (
          <>
            <p className="tabular text-muted text-[0.92rem]" role="status">
              {result.total} {result.total === 1 ? "result" : "results"}
              {params.q && (
                <>
                  {" "}
                  for <span className="text-fg">“{params.q}”</span>
                </>
              )}
            </p>
            <ol className="border-fg mt-6 border-t">
              {result.hits.map(({ article: a, titleHtml, snippetHtml }) => {
                const cat = a.categorySlug ? byslug.get(a.categorySlug) : undefined;
                return (
                  <li key={a.id} className="search-hit border-rule border-b py-7">
                    <div className="text-muted flex flex-wrap items-center gap-2 text-[0.82rem]">
                      <span className="smallcaps">{ARTICLE_TYPE_LABEL[a.type]}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular">
                        {a.issue ? issueLabelShort(a.issue) : `In press · ${formatDate(a.onlineAt)}`}
                      </span>
                      {a.isSample && <SampleTag />}
                    </div>
                    <h3 className="font-display mt-2 text-[1.35rem] leading-snug">
                      <Link
                        href={`/articles/${a.slug}`}
                        className="rule-thread"
                        dangerouslySetInnerHTML={{ __html: titleHtml }}
                      />
                    </h3>
                    <p className="text-muted mt-1.5 text-[0.92rem]">{a.authors.map((x) => x.name).join(", ")}</p>
                    <p
                      className="reading text-fg/90 mt-3 text-[1rem]"
                      dangerouslySetInnerHTML={{ __html: snippetHtml }}
                    />
                    {cat && <CategoryChip category={cat} className="mt-4" />}
                  </li>
                );
              })}
            </ol>
            <div className="mt-8">
              <Pagination page={params.page ?? 1} pages={pages} href={href} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
