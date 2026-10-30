import Link from "next/link";
import clsx from "clsx";
import { formatDate } from "@/lib/format";
import { issueLabelShort } from "@/lib/issues";
import { ARTICLE_TYPE_LABEL, type ArticleSummary, type Category } from "@/lib/types";
import { AuthorNames } from "./AuthorList";
import { CategoryChip } from "./CategoryChip";
import { SampleTag } from "./SampleTag";

/** Compact card for rails and "related" lists. Lifts 2px with an ochre underline on hover. */
export function ArticleCard({
  article,
  category,
  className,
  meta = "issue",
}: {
  article: ArticleSummary;
  category?: Category;
  className?: string;
  meta?: "issue" | "online";
}) {
  return (
    <article
      className={clsx(
        "group border-rule bg-surface ease-weave relative flex h-full flex-col rounded-[3px] border p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-24px_rgb(21_19_15/0.55)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="smallcaps text-muted text-[0.78rem]">{ARTICLE_TYPE_LABEL[article.type]}</span>
        {article.isSample && <SampleTag />}
      </div>
      <h3 className="font-display mt-4 text-[1.25rem] leading-snug">
        <Link
          href={`/articles/${article.slug}`}
          className="rule-thread text-fg after:absolute after:inset-0 after:content-['']"
        >
          {article.title}
        </Link>
      </h3>
      <AuthorNames authors={article.authors} className="text-muted mt-3 block text-[0.9rem]" />
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
        {category && <CategoryChip category={category} link={false} />}
        <span className="tabular text-muted text-[0.82rem]">
          {meta === "online" || !article.issue
            ? `Online ${formatDate(article.onlineAt)}`
            : issueLabelShort(article.issue)}
        </span>
      </div>
    </article>
  );
}
