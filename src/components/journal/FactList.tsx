import type { ReactNode } from "react";

/** A quiet "at a glance" card for page sidebars. */
export function FactList({
  title,
  items,
  children,
}: {
  title: string;
  items: [string, ReactNode][];
  children?: ReactNode;
}) {
  return (
    <div className="border-rule bg-surface rounded-[3px] border p-6 lg:sticky lg:top-24">
      <p className="smallcaps text-muted text-[0.78rem]">{title}</p>
      <dl className="mt-4 space-y-3 text-[0.9rem]">
        {items.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted">{k}</dt>
            <dd className="mt-0.5">{v}</dd>
          </div>
        ))}
      </dl>
      {children}
    </div>
  );
}
