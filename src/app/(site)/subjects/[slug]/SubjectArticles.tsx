"use client";

import { useState } from "react";
import { ArticleRow } from "@/components/journal/ArticleRow";
import { EmptyState } from "@/components/journal/EmptyState";
import { ARTICLE_TYPE_LABEL, type ArticleSummary, type ArticleType, type Category } from "@/lib/types";

const yearOf = (a: ArticleSummary) => a.issue?.year ?? Number((a.onlineAt ?? "").slice(0, 4));

/** Articles and reviews in a subject, filterable by type and year. */
export function SubjectArticles({ articles, category }: { articles: ArticleSummary[]; category: Category }) {
  const [type, setType] = useState<ArticleType | "all">("all");
  const [year, setYear] = useState<number | "all">("all");
  const types = [...new Set(articles.map((a) => a.type))];
  const years = [...new Set(articles.map(yearOf))].sort((a, b) => b - a);
  const shown = articles.filter((a) => (type === "all" || a.type === type) && (year === "all" || yearOf(a) === year));
  const select = "rounded-sm border border-rule bg-surface px-3 py-2.5 text-[0.92rem] text-fg";
  return (
    <>
      <div
        className="border-rule mb-8 flex flex-wrap items-end gap-4 border-b pb-6"
        role="search"
        aria-label="Filter articles"
      >
        <label className="flex flex-col gap-1.5">
          <span className="smallcaps text-muted text-[0.78rem]">Type</span>
          <select className={select} value={type} onChange={(e) => setType(e.target.value as ArticleType | "all")}>
            <option value="all">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {ARTICLE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
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
        <p className="tabular text-muted ml-auto text-[0.9rem]" aria-live="polite">
          {shown.length} {shown.length === 1 ? "article" : "articles"}
        </p>
      </div>
      {shown.length === 0 ? (
        <EmptyState title="Nothing here yet">No articles in this subject match these filters.</EmptyState>
      ) : (
        <div className="border-fg border-t">
          {shown.map((a) => (
            <ArticleRow key={a.id} article={a} category={category} showOnlineDate={!a.issue} showIssue />
          ))}
        </div>
      )}
    </>
  );
}
