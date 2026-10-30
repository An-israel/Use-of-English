import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="border-rule flex flex-wrap items-end justify-between gap-4 border-b px-5 py-8 lg:px-10">
      <div>
        <h1 className="font-display text-[2rem] leading-tight">{title}</h1>
        {description && <p className="text-muted mt-2 max-w-[44rem] text-[0.95rem]">{description}</p>}
      </div>
      {actions}
    </header>
  );
}
