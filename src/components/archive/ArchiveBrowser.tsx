"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { EmptyState } from "@/components/journal/EmptyState";
import { issueLabelShort, issuePath, monthName } from "@/lib/issues";
import type { Category, IssueSummary } from "@/lib/types";

export type ArchiveIssue = IssueSummary & { articleCount: number; categories: string[] };

/**
 * All issues by year, with a filter bar and a sticky year index on desktop.
 * Covers arrive already rendered on the server (`covers`, by issue id), so the
 * browser never recomputes the weave geometry while hydrating.
 */
export function ArchiveBrowser({
  issues,
  categories,
  covers,
}: {
  issues: ArchiveIssue[];
  categories: Category[];
  covers: Record<string, ReactNode>;
}) {
  const [year, setYear] = useState<number | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const years = useMemo(() => [...new Set(issues.map((i) => i.year))].sort((a, b) => b - a), [issues]);
  const shown = issues.filter(
    (i) => (year === "all" || i.year === year) && (category === "all" || i.categories.includes(category)),
  );
  const groups = years
    .map((y) => ({
      year: y,
      volume: issues.find((i) => i.year === y)?.volume,
      issues: shown.filter((i) => i.year === y),
    }))
    .filter((g) => g.issues.length);

  const select = "rounded-sm border border-rule bg-surface px-3 py-2.5 text-[0.92rem] text-fg";

  // Before the first issue: no filters, just where the first issue will come from.
  if (!issues.length)
    return (
      <div className="max-w-page mx-auto px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <EmptyState title="The first issue is in preparation">
          Every issue will be listed here as it is published. Submissions for the first issue are open: read the{" "}
          <Link href="/call-for-papers" className="text-brand decoration-thread underline underline-offset-4">
            Call for Papers
          </Link>
          .
        </EmptyState>
      </div>
    );

  return (
    <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
      <div
        className="border-rule col-span-12 mb-10 flex flex-wrap items-end gap-4 border-b pb-6"
        role="search"
        aria-label="Filter issues"
      >
        <label className="flex flex-col gap-1.5">
          <span className="smallcaps text-muted text-[0.78rem]">Year</span>
          <select
            className={select}
            value={year}
            onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="smallcaps text-muted text-[0.78rem]">Subject</span>
          <select className={clsx(select, "max-w-full")} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All subjects</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="tabular text-muted ml-auto text-[0.9rem]" aria-live="polite">
          {shown.length} {shown.length === 1 ? "issue" : "issues"}
        </p>
      </div>

      <nav aria-label="Jump to year" className="col-span-2 hidden lg:block">
        <ol className="sticky top-24 space-y-1">
          {groups.map((g) => (
            <li key={g.year}>
              <a
                href={`#y${g.year}`}
                className="tabular font-display text-muted hover:text-fg block py-1 text-[1.6rem] transition-colors"
              >
                {g.year}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="col-span-12 lg:col-span-10">
        {groups.length === 0 && (
          <EmptyState title="No issues match">Try another year or subject, or clear the filters.</EmptyState>
        )}
        {groups.map((g) => (
          <section
            key={g.year}
            id={`y${g.year}`}
            aria-labelledby={`yh${g.year}`}
            className="border-fg scroll-mt-24 border-t pt-6 pb-16 first:border-t-0 first:pt-0"
          >
            <h2 id={`yh${g.year}`} className="font-display flex items-baseline gap-4 text-[2rem]">
              <span className="tabular">{g.year}</span>
              <span className="smallcaps text-muted font-sans text-[0.85rem] font-normal tracking-[0.08em]">
                Volume {g.volume}
              </span>
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 xl:grid-cols-4">
              {g.issues.map((i) => (
                <li key={i.id}>
                  <Link href={issuePath(i)} className="group block">
                    {covers[i.id]}
                    <span className="font-display group-hover:decoration-thread mt-4 block text-[1.15rem] group-hover:underline group-hover:underline-offset-4">
                      Issue {i.number} · {monthName(i.month)}
                    </span>
                    <span className="tabular text-muted mt-1 block text-[0.85rem]">
                      {issueLabelShort(i)} · {i.articleCount} articles
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
