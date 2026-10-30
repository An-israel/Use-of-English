import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.85rem]">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className="border-thread inline-block size-[0.3rem] rotate-45 border" />}
            {c.href ? (
              <Link
                href={c.href}
                className="hover:text-fg hover:decoration-thread hover:underline hover:underline-offset-4"
              >
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
