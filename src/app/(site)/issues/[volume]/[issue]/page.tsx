import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleRow } from "@/components/journal/ArticleRow";
import { Breadcrumbs } from "@/components/journal/Breadcrumbs";
import { SampleTag } from "@/components/journal/SampleTag";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { ArrowRightIcon } from "@/components/ui/icons";
import { IssueCover } from "@/components/weave/IssueCover";
import { getCategories, getIssue, getIssues, getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { issueLabel, issueLabelShort, issuePath, issueRunningHead } from "@/lib/issues";
import { sanitize } from "@/lib/sanitize";
import type { ArticleType } from "@/lib/types";
import { atLeastOne } from "@/lib/static-params";

type Params = { volume: string; issue: string };

const TYPE_ORDER: ArticleType[] = [
  "editorial",
  "research_article",
  "theoretical_paper",
  "critical_review",
  "book_review",
];
const TYPE_PLURAL: Record<ArticleType, string> = {
  editorial: "Editorial",
  research_article: "Research Articles",
  theoretical_paper: "Theoretical Papers",
  critical_review: "Critical Reviews",
  book_review: "Book Reviews",
};

function parse(p: Params) {
  const volume = Number(p.volume);
  const number = Number(p.issue);
  return Number.isInteger(volume) && Number.isInteger(number) && volume > 0 && number > 0 ? { volume, number } : null;
}

export async function generateStaticParams(): Promise<Params[]> {
  const issues = await getIssues();
  return atLeastOne(
    issues.map((i) => ({ volume: String(i.volume), issue: String(i.number) })),
    { volume: "0", issue: "0" },
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const ref = parse(await params);
  const issue = ref && (await getIssue(ref.volume, ref.number));
  if (!issue) return { title: "Issue not found" };
  return {
    title: issueLabel(issue),
    description: `Table of contents for ${issueLabel(issue)} of the Journal of Humanities and Transcultural Studies.`,
    alternates: { canonical: issuePath(issue) },
  };
}

export default function IssuePage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IssueContent params={params} />
    </Suspense>
  );
}

async function IssueContent({ params }: { params: Promise<Params> }) {
  const ref = parse(await params);
  if (!ref) notFound();
  const [issue, issues, categories, settings] = await Promise.all([
    getIssue(ref.volume, ref.number),
    getIssues(),
    getCategories(),
    getSettings(),
  ]);
  if (!issue) notFound();

  const byslug = new Map(categories.map((c) => [c.slug, c]));
  const idx = issues.findIndex((i) => i.id === issue.id);
  const newer = idx > 0 ? issues[idx - 1] : null;
  const older = idx >= 0 && idx < issues.length - 1 ? issues[idx + 1] : null;
  // Grouped by article type; groups follow the page order of their first article.
  const groups = TYPE_ORDER.map((t) => ({ type: t, articles: issue.articles.filter((a) => a.type === t) }))
    .filter((g) => g.articles.length)
    .sort((a, b) => (a.articles[0].firstPage ?? 1e9) - (b.articles[0].firstPage ?? 1e9));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    issueNumber: issue.number,
    datePublished: issue.publishedAt?.slice(0, 10),
    url: siteUrl + issuePath(issue),
    isPartOf: {
      "@type": "PublicationVolume",
      volumeNumber: issue.volume,
      isPartOf: {
        "@type": "Periodical",
        name: settings.journalName,
        ...(settings.issn ? { issn: settings.issn } : {}),
      },
    },
    hasPart: issue.articles.map((a) => ({
      "@type": "ScholarlyArticle",
      headline: a.title,
      url: `${siteUrl}/articles/${a.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="border-rule bg-surface border-b">
        <div className="max-w-page mx-auto px-4 pt-8 sm:px-6 lg:px-10">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "All issues", href: "/issues" },
              { label: issueLabelShort(issue) },
            ]}
          />
        </div>
        <div className="max-w-page mx-auto grid grid-cols-12 items-end gap-x-6 gap-y-10 px-4 pt-10 pb-16 sm:px-6 lg:px-10 lg:pt-14 lg:pb-24">
          <div className="col-span-8 col-start-3 sm:col-span-5 sm:col-start-auto md:col-span-4 lg:col-span-3">
            <IssueCover
              volume={issue.volume}
              issue={issue.number}
              month={issue.month}
              year={issue.year}
              coverUrl={issue.coverUrl}
              priority
              className="shadow-[0_40px_60px_-40px_rgb(21_19_15/0.75)]"
            />
          </div>
          <div className="col-span-12 sm:col-span-7 md:col-span-8 lg:col-span-8 lg:col-start-5">
            <div className="flex flex-wrap items-center gap-3">
              <p className="smallcaps text-thread-text text-[0.88rem]">{issueRunningHead(issue)}</p>
              {issue.isSample && <SampleTag />}
            </div>
            <h1 className="display-tight font-display mt-4 text-[clamp(2.4rem,1.6rem+3.6vw,4.6rem)]">
              Volume {issue.volume}, Issue {issue.number}
            </h1>
            {issue.title && <p className="font-display text-muted mt-3 text-[1.5rem] italic">{issue.title}</p>}
            <p className="text-muted mt-5">
              {issue.articles.length} articles
              {issue.publishedAt && (
                <>
                  <span aria-hidden="true"> · </span>Published {formatDate(issue.publishedAt)}
                </>
              )}
            </p>
            {(issue.fullPdfUrl || issue.fullDocxUrl) && (
              <div className="mt-8 flex flex-wrap gap-3">
                {issue.fullPdfUrl && (
                  <a
                    href={issue.fullPdfUrl}
                    className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-5 py-3 font-medium"
                  >
                    Download full issue (PDF)
                  </a>
                )}
                {issue.fullDocxUrl && (
                  <a
                    href={issue.fullDocxUrl}
                    className="border-fg/80 hover:bg-fg hover:text-bg rounded-sm border px-5 py-3 font-medium"
                  >
                    Word
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 px-4 sm:px-6 lg:px-10">
        {issue.editorialHtml && (
          <section
            aria-labelledby="editorial-title"
            className="border-rule col-span-12 border-b py-16 lg:col-span-8 lg:col-start-3 lg:py-24"
          >
            <p className="smallcaps text-muted text-[0.85rem]">From the Editor-in-Chief</p>
            <h2 id="editorial-title" className="font-display mt-3 text-[2rem]">
              Editorial
            </h2>
            <div
              className="prose-jhts reading mt-8"
              dangerouslySetInnerHTML={{ __html: sanitize(issue.editorialHtml) }}
            />
          </section>
        )}

        <section aria-labelledby="toc-title" className="col-span-12 py-16 lg:py-24">
          <h2 id="toc-title" className="sr-only">
            Table of contents
          </h2>
          {groups.map((g) => (
            <div key={g.type} className="mt-14 grid grid-cols-12 gap-x-6 first:mt-0">
              <h3 className="border-fg font-display col-span-12 border-b pb-3 text-[1.6rem] lg:col-span-3 lg:border-b-0 lg:pt-7 lg:pb-0">
                {TYPE_PLURAL[g.type]}
                <span className="tabular text-muted ml-2 align-middle font-sans text-[0.85rem]">
                  {g.articles.length}
                </span>
              </h3>
              <div className="lg:border-fg col-span-12 lg:col-span-9 lg:border-t">
                {g.articles.map((a) => (
                  <ArticleRow
                    key={a.id}
                    article={a}
                    category={a.categorySlug ? byslug.get(a.categorySlug) : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>

      <nav aria-label="Other issues" className="border-rule border-t">
        <div className="max-w-page mx-auto grid grid-cols-2 px-4 sm:px-6 lg:px-10">
          <div className="py-10">
            {older && (
              <Link href={issuePath(older)} className="group block">
                <span className="smallcaps text-muted text-[0.8rem]">Previous issue</span>
                <span className="font-display group-hover:decoration-thread mt-2 block text-[1.2rem] group-hover:underline group-hover:underline-offset-4 sm:text-[1.4rem]">
                  {issueLabel(older)}
                </span>
              </Link>
            )}
          </div>
          <div className="border-rule border-l py-10 pl-6 text-right">
            {newer && (
              <Link href={issuePath(newer)} className="group block">
                <span className="smallcaps text-muted inline-flex items-center gap-2 text-[0.8rem]">
                  Next issue <ArrowRightIcon width={14} height={14} />
                </span>
                <span className="font-display group-hover:decoration-thread mt-2 block text-[1.2rem] group-hover:underline group-hover:underline-offset-4 sm:text-[1.4rem]">
                  {issueLabel(newer)}
                </span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
