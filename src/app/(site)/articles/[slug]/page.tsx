import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { CitePanel } from "@/components/article/CitePanel";
import { ReadingSurface } from "@/components/article/ReadingSurface";
import { ShareButtons } from "@/components/article/ShareButtons";
import { ViewBeacon } from "@/components/article/ViewBeacon";
import { PdfReaderLazy } from "@/components/article/PdfReaderLazy";
import { ArticleCard } from "@/components/journal/ArticleCard";
import { AuthorBlock } from "@/components/journal/AuthorList";
import { BookCover } from "@/components/journal/BookCover";
import { Breadcrumbs } from "@/components/journal/Breadcrumbs";
import { CategoryChip } from "@/components/journal/CategoryChip";
import { SampleTag } from "@/components/journal/SampleTag";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { getArticle, getArticles, getCategories, getIssue, getSettings, getSlugRedirect } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { formatCount, formatDate } from "@/lib/format";
import { issueLabel, issueLabelShort, issuePath, pageRange } from "@/lib/issues";
import { sanitizeWithToc } from "@/lib/sanitize";
import type { Citable } from "@/lib/citations";
import { ARTICLE_TYPE_LABEL, type Article, type SiteSettings } from "@/lib/types";
import { atLeastOne } from "@/lib/static-params";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return atLeastOne(
    (await getArticles()).map((a) => ({ slug: a.slug })),
    { slug: "none" },
  );
}

function citable(a: Article, s: SiteSettings): Citable {
  const year = Number((a.issue ? String(a.issue.year) : (a.onlineAt ?? "")).slice(0, 4)) || new Date().getFullYear();
  return {
    title: a.title,
    authors: a.authors,
    journal: s.journalName,
    issn: s.issn,
    volume: a.issue?.volume ?? null,
    issue: a.issue?.number ?? null,
    year,
    firstPage: a.firstPage,
    lastPage: a.lastPage,
    doi: a.doi,
    url: `${siteUrl}/articles/${a.slug}`,
    inPress: !a.issue,
    onlineDate: a.onlineAt,
    publisher: s.publisher,
    keywords: a.keywords,
    abstract: a.abstract,
  };
}

/** Google Scholar (Highwire) tags, with Dublin Core as a fallback (section 12). */
function scholarTags(a: Article, s: SiteSettings): Record<string, string | string[]> {
  const date = (iso: string | null) => (iso ? iso.slice(0, 10).replace(/-/g, "/") : undefined);
  const tags: Record<string, string | string[] | undefined> = {
    citation_title: a.title,
    citation_author: a.authors.map((x) => x.name),
    citation_author_institution: a.authors.map((x) => x.affiliation ?? ""),
    citation_publication_date: date(a.publishedAt ?? a.onlineAt),
    citation_online_date: date(a.onlineAt),
    citation_journal_title: s.journalName,
    citation_journal_abbrev: s.shortName,
    citation_issn: s.issn ?? undefined,
    citation_volume: a.issue ? String(a.issue.volume) : undefined,
    citation_issue: a.issue ? String(a.issue.number) : undefined,
    citation_firstpage: a.firstPage ? String(a.firstPage) : undefined,
    citation_lastpage: a.lastPage ? String(a.lastPage) : undefined,
    citation_pdf_url: a.hasPdf ? `${siteUrl}/api/download/article/${a.id}?format=pdf` : undefined,
    citation_doi: a.doi ?? undefined,
    citation_keywords: a.keywords.join("; "),
    citation_publisher: s.publisher,
    citation_language: "en",
    citation_abstract_html_url: `${siteUrl}/articles/${a.slug}`,
    "DC.title": a.title,
    "DC.creator": a.authors.map((x) => x.name),
    "DC.date": (a.publishedAt ?? a.onlineAt ?? "").slice(0, 10),
    "DC.publisher": s.publisher,
    "DC.type": "Text.Serial.Journal",
    "DC.language": "en",
    "DC.rights": s.licence.url,
    "DC.identifier": a.doi ? `doi:${a.doi}` : `${siteUrl}/articles/${a.slug}`,
  };
  return Object.fromEntries(Object.entries(tags).filter(([, v]) => v !== undefined && v !== "")) as Record<
    string,
    string | string[]
  >;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const [a, s] = await Promise.all([getArticle(slug), getSettings()]);
  if (!a) return { title: "Article not found" };
  return {
    title: a.title,
    description: a.abstract.slice(0, 200),
    alternates: { canonical: `/articles/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.abstract.slice(0, 200),
      authors: a.authors.map((x) => x.name),
    },
    other: scholarTags(a, s),
  };
}

export default function ArticlePage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ArticleContent params={params} />
    </Suspense>
  );
}

async function ArticleContent({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) {
    const moved = await getSlugRedirect("article", slug);
    if (moved) permanentRedirect(`/articles/${moved}`);
    notFound();
  }
  const [settings, categories, all, issue] = await Promise.all([
    getSettings(),
    getCategories(),
    getArticles(),
    article.issue ? getIssue(article.issue.volume, article.issue.number) : Promise.resolve(null),
  ]);
  const category = categories.find((c) => c.slug === article.categorySlug);
  const byslug = new Map(categories.map((c) => [c.slug, c]));
  const fromIssue = (issue?.articles ?? []).filter((a) => a.id !== article.id).slice(0, 3);
  const inCategory = all
    .filter(
      (a) => a.categorySlug === article.categorySlug && a.id !== article.id && !fromIssue.some((f) => f.id === a.id),
    )
    .slice(0, 3);
  const full = article.bodyHtml ? sanitizeWithToc(article.bodyHtml) : null;
  const url = `${siteUrl}/articles/${article.slug}`;
  const pages = pageRange(article.firstPage, article.lastPage);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": article.bookReview ? "Review" : "ScholarlyArticle",
    headline: article.title,
    name: article.title,
    abstract: article.abstract,
    keywords: article.keywords.join(", "),
    author: article.authors.map((x) => ({
      "@type": "Person",
      name: x.name,
      ...(x.affiliation ? { affiliation: { "@type": "Organization", name: x.affiliation } } : {}),
      ...(x.orcid ? { sameAs: `https://orcid.org/${x.orcid}` } : {}),
    })),
    datePublished: (article.publishedAt ?? article.onlineAt)?.slice(0, 10),
    url,
    license: settings.licence.url,
    isAccessibleForFree: true,
    ...(article.doi ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: article.doi } } : {}),
    ...(article.firstPage ? { pageStart: article.firstPage, pageEnd: article.lastPage } : {}),
    ...(article.bookReview
      ? {
          itemReviewed: {
            "@type": "Book",
            name: article.bookReview.bookTitle,
            author: article.bookReview.bookAuthor,
            ...(article.bookReview.isbn ? { isbn: article.bookReview.isbn } : {}),
            ...(article.bookReview.publisher ? { publisher: article.bookReview.publisher } : {}),
          },
        }
      : {}),
    isPartOf: article.issue
      ? {
          "@type": "PublicationIssue",
          issueNumber: article.issue.number,
          isPartOf: {
            "@type": "PublicationVolume",
            volumeNumber: article.issue.volume,
            isPartOf: { "@type": "Periodical", name: settings.journalName },
          },
        }
      : { "@type": "Periodical", name: settings.journalName },
  };

  const meta: [string, ReactNode][] = [
    [
      "Issue",
      article.issue ? (
        <Link
          href={issuePath(article.issue)}
          className="decoration-thread hover:text-brand underline underline-offset-4"
        >
          {issueLabel(article.issue)}
        </Link>
      ) : (
        "Article in Press"
      ),
    ],
    ...(pages
      ? ([
          [
            "Pages",
            <span key="p" className="tabular">
              {pages}
            </span>,
          ],
        ] as [string, ReactNode][])
      : []),
    [
      "DOI",
      article.doi ? (
        <a href={`https://doi.org/${article.doi}`} className="decoration-thread break-all underline underline-offset-4">
          {article.doi}
        </a>
      ) : (
        <span className="text-muted">Assigned once JHTS joins Crossref</span>
      ),
    ],
    [
      "Received",
      <span key="r" className="tabular">
        {formatDate(article.receivedAt)}
      </span>,
    ],
    [
      "Accepted",
      <span key="a" className="tabular">
        {formatDate(article.acceptedAt)}
      </span>,
    ],
    [
      article.issue ? "Published" : "Online",
      <span key="o" className="tabular">
        {formatDate(article.publishedAt ?? article.onlineAt)}
      </span>,
    ],
  ];

  return (
    <article>
      <ViewBeacon articleId={article.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="border-rule border-b">
        <div className="max-w-page mx-auto px-4 pt-8 sm:px-6 lg:px-10">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              article.issue
                ? { label: issueLabelShort(article.issue), href: issuePath(article.issue) }
                : { label: "Articles in Press", href: "/in-press" },
              { label: ARTICLE_TYPE_LABEL[article.type] },
            ]}
          />
        </div>
        <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-10 px-4 pt-10 pb-14 sm:px-6 lg:px-10 lg:pt-14 lg:pb-20">
          <div className="col-span-12 lg:col-span-9">
            <div className="flex flex-wrap items-center gap-3">
              <span className="smallcaps text-thread-text text-[0.88rem]">{ARTICLE_TYPE_LABEL[article.type]}</span>
              {category && <CategoryChip category={category} />}
              {article.isSample && <SampleTag />}
            </div>
            <h1 className="font-display mt-6 max-w-[24ch] text-[clamp(2.1rem,1.5rem+2.6vw,3.6rem)] leading-[1.06] font-medium tracking-[-0.025em]">
              {article.title}
            </h1>
            <div className="mt-8">
              <AuthorBlock authors={article.authors} />
            </div>
          </div>
          <dl className="border-rule col-span-12 grid grid-cols-[auto_1fr] content-start gap-x-5 gap-y-2.5 border-t pt-6 text-[0.88rem] sm:grid-cols-[auto_1fr_auto_1fr] lg:col-span-3 lg:grid-cols-[auto_1fr] lg:border-t-0 lg:border-l lg:pt-1 lg:pl-6">
            {meta.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="smallcaps text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="smallcaps text-muted">Licence</dt>
              <dd>
                <a
                  href={settings.licence.url}
                  rel="license noopener"
                  className="border-rule hover:border-fg inline-flex items-center gap-2 rounded-[2px] border px-2 py-0.5"
                >
                  <span className="font-display font-semibold">OA</span> {article.licence}
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <aside className="order-last col-span-12 mt-16 lg:order-first lg:col-span-3 lg:mt-0" aria-label="Article tools">
          <div className="space-y-8 lg:sticky lg:top-24">
            {(article.hasPdf || article.hasDocx) && (
              <div className="flex flex-col gap-2">
                {article.hasPdf && (
                  <a
                    href={`/api/download/article/${article.id}?format=pdf`}
                    className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-4 py-3 text-center font-medium"
                  >
                    Download PDF
                  </a>
                )}
                {article.hasDocx && (
                  <a
                    href={`/api/download/article/${article.id}?format=docx`}
                    className="border-fg/80 hover:bg-fg hover:text-bg rounded-sm border px-4 py-3 text-center font-medium"
                  >
                    Download Word
                  </a>
                )}
              </div>
            )}
            <ShareButtons url={url} title={article.title} />
            <dl className="border-rule grid grid-cols-2 gap-4 border-y py-5">
              <div>
                <dt className="smallcaps text-muted text-[0.78rem]">Views</dt>
                <dd className="tabular font-display mt-1 text-[1.6rem]">{formatCount(article.viewCount)}</dd>
              </div>
              <div>
                <dt className="smallcaps text-muted text-[0.78rem]">Downloads</dt>
                <dd className="tabular font-display mt-1 text-[1.6rem]">{formatCount(article.downloadCount)}</dd>
              </div>
            </dl>
            {full && full.toc.length > 0 && (
              <nav aria-label="Contents" className="hidden lg:block">
                <p className="smallcaps text-muted text-[0.78rem]">Contents</p>
                <ol className="border-rule mt-3 space-y-2 border-l text-[0.9rem]">
                  <li>
                    <a
                      href="#abstract"
                      className="text-muted hover:border-thread hover:text-fg -ml-px block border-l border-transparent pl-4"
                    >
                      Abstract
                    </a>
                  </li>
                  {full.toc.map((t) => (
                    <li key={t.id}>
                      <a
                        href={`#${t.id}`}
                        className={`text-muted hover:border-thread hover:text-fg -ml-px block border-l border-transparent ${t.level === 3 ? "pl-7 text-[0.85rem]" : "pl-4"}`}
                      >
                        {t.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </aside>

        <div className="col-span-12 lg:col-span-6">
          {article.bookReview && (
            <section
              aria-label="Book under review"
              className="border-rule bg-surface mb-12 grid grid-cols-[7rem_1fr] gap-6 rounded-[3px] border p-5 sm:grid-cols-[8.5rem_1fr]"
            >
              <BookCover book={article.bookReview} />
              <div>
                <p className="smallcaps text-muted text-[0.78rem]">Book under review</p>
                <p className="font-display mt-2 text-[1.3rem] leading-snug">{article.bookReview.bookTitle}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.86rem]">
                  <dt className="text-muted">Author</dt>
                  <dd>{article.bookReview.bookAuthor}</dd>
                  {article.bookReview.publisher && (
                    <>
                      <dt className="text-muted">Publisher</dt>
                      <dd>
                        {article.bookReview.publisher}
                        {article.bookReview.year ? `, ${article.bookReview.year}` : ""}
                      </dd>
                    </>
                  )}
                  {article.bookReview.isbn && (
                    <>
                      <dt className="text-muted">ISBN</dt>
                      <dd className="tabular">{article.bookReview.isbn}</dd>
                    </>
                  )}
                  {article.bookReview.pages && (
                    <>
                      <dt className="text-muted">Pages</dt>
                      <dd className="tabular">{article.bookReview.pages}</dd>
                    </>
                  )}
                </dl>
              </div>
            </section>
          )}

          <section aria-labelledby="abstract">
            <h2 id="abstract" className="font-display scroll-mt-24 text-[1.6rem]">
              Abstract
            </h2>
            <p className="reading text-fg mt-5">{article.abstract}</p>
            {article.keywords.length > 0 && (
              <div className="mt-8">
                <h3 className="smallcaps text-muted font-sans text-[0.8rem] font-normal tracking-[0.08em]">Keywords</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {article.keywords.map((k) => (
                    <li key={k}>
                      <Link
                        href={`/search?q=${encodeURIComponent(k)}`}
                        className="border-rule text-fg hover:border-thread inline-block rounded-[2px] border px-2.5 py-1 text-[0.85rem]"
                      >
                        {k}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="cite-title" className="mt-14">
            <h2 id="cite-title" className="font-display text-[1.6rem]">
              Cite this article
            </h2>
            <div className="mt-5">
              <CitePanel citable={citable(article, settings)} />
            </div>
          </section>

          {full && (
            <section aria-label="Full text" className="mt-16">
              <ReadingSurface html={full.html} />
            </section>
          )}

          {article.pdfUrl && (
            <section aria-labelledby="pdf-title" className="mt-16">
              <h2 id="pdf-title" className="font-display text-[1.6rem]">
                {full ? "The typeset PDF" : "Read the article"}
              </h2>
              <div className="mt-5">
                <PdfReaderLazy
                  url={article.pdfUrl}
                  title={article.title}
                  downloadHref={`/api/download/article/${article.id}?format=pdf`}
                />
              </div>
            </section>
          )}
        </div>
      </div>

      {(fromIssue.length > 0 || inCategory.length > 0) && (
        <aside aria-label="Related articles" className="border-rule bg-surface border-t">
          <div className="max-w-page mx-auto space-y-16 px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
            {fromIssue.length > 0 && article.issue && (
              <div>
                <h2 className="font-display text-[1.8rem]">More from this issue</h2>
                <ul className="mt-8 grid gap-5 md:grid-cols-3">
                  {fromIssue.map((a) => (
                    <li key={a.id}>
                      <ArticleCard
                        article={a}
                        category={a.categorySlug ? byslug.get(a.categorySlug) : undefined}
                        className="bg-bg"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {inCategory.length > 0 && category && (
              <div>
                <h2 className="font-display text-[1.8rem]">More in {category.name}</h2>
                <ul className="mt-8 grid gap-5 md:grid-cols-3">
                  {inCategory.map((a) => (
                    <li key={a.id}>
                      <ArticleCard article={a} category={category} className="bg-bg" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      )}
    </article>
  );
}
