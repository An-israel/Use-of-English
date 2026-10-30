import type { ReactNode } from "react";
import { sanitizeWithToc } from "@/lib/sanitize";
import { formatDate } from "@/lib/format";

/**
 * Long-form page body: sanitised rich text in the reading column, an optional
 * sticky contents list on the left and an optional aside on the right.
 */
export function ProseBody({
  html,
  aside,
  before,
  after,
  updatedAt,
  toc = true,
}: {
  html: string;
  aside?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  updatedAt?: string;
  toc?: boolean;
}) {
  const { html: clean, toc: entries } = sanitizeWithToc(html);
  const showToc = toc && entries.length > 2;
  return (
    <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-12 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      {showToc && (
        <aside className="col-span-12 lg:col-span-3">
          {
            <nav aria-label="On this page" className="lg:sticky lg:top-24">
              <p className="smallcaps text-muted text-[0.78rem]">On this page</p>
              <ol className="border-rule mt-3 space-y-2 border-l text-[0.9rem]">
                {entries
                  .filter((e) => e.level === 2)
                  .map((e) => (
                    <li key={e.id}>
                      <a
                        href={`#${e.id}`}
                        className="text-muted hover:border-thread hover:text-fg -ml-px block border-l border-transparent pl-4"
                      >
                        {e.text}
                      </a>
                    </li>
                  ))}
              </ol>
            </nav>
          }
        </aside>
      )}
      <div className={showToc ? "col-span-12 lg:col-span-6" : "col-span-12 lg:col-span-7 lg:col-start-2"}>
        {before}
        <div className="prose-jhts reading" dangerouslySetInnerHTML={{ __html: clean }} />
        {after}
        {updatedAt && <p className="text-muted mt-14 text-[0.82rem]">Last updated {formatDate(updatedAt)}</p>}
      </div>
      {aside && (
        <div className={showToc ? "col-span-12 lg:col-span-3" : "col-span-12 lg:col-span-3 lg:col-start-10"}>
          {aside}
        </div>
      )}
    </div>
  );
}
