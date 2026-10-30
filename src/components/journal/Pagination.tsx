import Link from "next/link";
import clsx from "clsx";

/** Page links with first, last and neighbours; "…" for gaps. */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) items.push("gap");
    items.push(n);
  });
  const cell = "tabular inline-flex min-w-10 items-center justify-center rounded-sm px-3 py-2 text-[0.92rem]";
  return (
    <nav aria-label="Pagination" className="border-rule flex items-center justify-between gap-4 border-t pt-6">
      {page > 1 ? (
        <Link href={href(page - 1)} className={clsx(cell, "border-rule hover:border-fg border")} rel="prev">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <ol className="hidden items-center gap-1 sm:flex">
        {items.map((n, i) =>
          n === "gap" ? (
            <li key={`g${i}`} className="text-muted px-1" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className={clsx(cell, "bg-fg text-bg")}>
                  {n}
                </span>
              ) : (
                <Link href={href(n)} className={clsx(cell, "hover:bg-surface")} aria-label={`Page ${n}`}>
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
      </ol>
      <span className="tabular text-muted text-[0.88rem] sm:hidden">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={clsx(cell, "border-rule hover:border-fg border")} rel="next">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
