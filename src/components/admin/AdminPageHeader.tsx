import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Breadcrumbs above the title; the current page is not repeated. */
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <header className="border-rule flex flex-wrap items-end justify-between gap-4 border-b px-5 py-7 lg:px-10">
      <div className="min-w-0">
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="text-muted mb-2 text-[0.82rem]">
            <ol className="flex flex-wrap items-center gap-1.5">
              {crumbs.map((c) => (
                <li key={c.href} className="flex items-center gap-1.5">
                  <Link href={c.href} className="hover:text-fg">
                    {c.label}
                  </Link>
                  <span aria-hidden="true">/</span>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <h1 className="font-display text-[1.85rem] leading-tight text-balance">{title}</h1>
        {description && <div className="text-muted mt-2 max-w-[48rem] text-[0.93rem]">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
