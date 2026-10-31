import Link from "next/link";
import { IssueCover } from "@/components/weave/IssueCover";
import { CategoryChip } from "@/components/journal/CategoryChip";
import { AuthorNames } from "@/components/journal/AuthorList";
import { Reveal } from "@/components/journal/Reveal";
import { ArrowRightIcon } from "@/components/ui/icons";
import { issuePath, issueRunningHead, pageRange } from "@/lib/issues";
import { formatDate } from "@/lib/format";
import type { IssueWithArticles } from "@/lib/data/source";
import type { Category } from "@/lib/types";

const excerpt = (html: string | null) => {
  const first = (html ?? "").match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
  return first.replace(/<[^>]+>/g, "");
};

export function CurrentIssueFeature({
  issue,
  categories,
}: {
  issue: IssueWithArticles;
  categories: Map<string, Category>;
}) {
  return (
    <section aria-labelledby="current-title" className="border-rule bg-surface border-b">
      <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-12 px-4 py-20 sm:px-6 lg:px-10 lg:py-32">
        <div className="col-span-12 md:col-span-5 lg:col-span-4">
          <div className="md:sticky md:top-28">
            <Link href={issuePath(issue)} className="group block">
              <IssueCover
                volume={issue.volume}
                issue={issue.number}
                month={issue.month}
                year={issue.year}
                coverUrl={issue.coverUrl}
                priority
                className="ease-weave mx-auto max-w-[22rem] shadow-[0_40px_60px_-40px_rgb(21_19_15/0.75)] transition-transform duration-500 group-hover:-translate-y-1 md:max-w-none"
              />
            </Link>
          </div>
        </div>
        <div className="col-span-12 md:col-span-7 lg:col-span-7 lg:col-start-6">
          <p className="smallcaps text-muted text-[0.85rem]">Current issue</p>
          <h2 id="current-title" className="font-display mt-3 text-[clamp(2rem,1.5rem+1.8vw,3rem)] leading-[1.05]">
            Volume {issue.volume}, Issue {issue.number}
          </h2>
          <p className="smallcaps text-thread-text mt-3 text-[0.9rem]">{issueRunningHead(issue)}</p>
          {issue.publishedAt && (
            <p className="text-muted mt-1 text-[0.9rem]">Published {formatDate(issue.publishedAt)}</p>
          )}

          <blockquote className="border-thread mt-10 border-l-2 pl-6">
            <p className="font-reading text-fg/90 text-[1.15rem] leading-relaxed italic">
              {excerpt(issue.editorialHtml)}
            </p>
            <footer className="text-muted mt-3 text-[0.88rem]">From the editorial</footer>
          </blockquote>

          <h3 className="smallcaps text-muted mt-14 font-sans text-[0.85rem] font-normal tracking-[0.08em]">
            In this issue
          </h3>
          <ol className="divide-rule border-rule mt-4 divide-y border-y">
            {issue.articles.map((a, i) => {
              const cat = a.categorySlug ? categories.get(a.categorySlug) : undefined;
              return (
                <Reveal as="li" index={i} key={a.id} className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 py-5">
                  <div>
                    <Link
                      href={`/articles/${a.slug}`}
                      className="rule-thread font-display text-fg text-[1.2rem] leading-snug"
                    >
                      {a.title}
                    </Link>
                    <AuthorNames authors={a.authors} className="text-muted mt-1.5 block text-[0.9rem]" />
                    {cat && <CategoryChip category={cat} className="mt-3" />}
                  </div>
                  <span className="tabular text-muted pt-1 text-[0.85rem]">{pageRange(a.firstPage, a.lastPage)}</span>
                </Reveal>
              );
            })}
          </ol>
          <Link
            href={issuePath(issue)}
            className="group text-brand mt-8 inline-flex items-center gap-2 text-[0.95rem] hover:underline hover:underline-offset-4"
          >
            Read the full issue
            <ArrowRightIcon width={16} height={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
