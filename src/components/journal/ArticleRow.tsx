import Link from "next/link";
import { pageRange } from "@/lib/issues";
import { formatDate } from "@/lib/format";
import type { ArticleSummary, Category } from "@/lib/types";
import { AuthorNames } from "./AuthorList";
import { CategoryChip } from "./CategoryChip";
import { SampleTag } from "./SampleTag";

/**
 * One row of a table of contents (issue pages, Articles in Press):
 * chip, title, authors, pages, an Abstract disclosure and download buttons.
 */
export function ArticleRow({
  article,
  category,
  showOnlineDate = false,
}: {
  article: ArticleSummary;
  category?: Category;
  showOnlineDate?: boolean;
}) {
  const pages = pageRange(article.firstPage, article.lastPage);
  return (
    <article className="group border-rule grid grid-cols-12 gap-x-6 gap-y-3 border-t py-7 first:border-t-0 md:py-8">
      <div className="col-span-12 flex flex-wrap items-center gap-2 md:col-span-2 md:flex-col md:items-start md:gap-3">
        {pages && <span className="tabular text-muted text-[0.9rem]">{pages}</span>}
        {showOnlineDate && article.onlineAt && (
          <span className="tabular text-muted text-[0.85rem]">Online {formatDate(article.onlineAt)}</span>
        )}
      </div>
      <div className="col-span-12 md:col-span-10">
        <div className="flex flex-wrap items-center gap-2">
          {category && <CategoryChip category={category} />}
          {article.isSample && <SampleTag />}
        </div>
        <h3 className="font-display mt-3 text-[1.3rem] leading-snug md:text-[1.45rem]">
          <Link href={`/articles/${article.slug}`} className="rule-thread text-fg">
            {article.title}
          </Link>
        </h3>
        <AuthorNames authors={article.authors} className="text-muted mt-2 block text-[0.95rem]" />
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <details className="group/abs w-full [&_summary::-webkit-details-marker]:hidden">
            <summary className="text-brand inline-flex cursor-pointer items-center gap-2 text-[0.9rem] select-none">
              <span
                aria-hidden="true"
                className="inline-block size-[0.42rem] rotate-45 border border-current transition-colors group-open/abs:bg-current"
              />
              <span className="group-open/abs:hidden">Abstract</span>
              <span className="hidden group-open/abs:inline">Hide abstract</span>
            </summary>
            <p className="reading text-fg/90 mt-4 text-[1.02rem]">{article.abstract}</p>
          </details>
          {(article.hasPdf || article.hasDocx) && (
            <div className="flex gap-2">
              {article.hasPdf && (
                <a
                  href={`/api/download/article/${article.id}?format=pdf`}
                  className="border-rule hover:border-fg rounded-[2px] border px-3 py-1.5 text-[0.82rem]"
                >
                  PDF
                </a>
              )}
              {article.hasDocx && (
                <a
                  href={`/api/download/article/${article.id}?format=docx`}
                  className="border-rule hover:border-fg rounded-[2px] border px-3 py-1.5 text-[0.82rem]"
                >
                  Word
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
