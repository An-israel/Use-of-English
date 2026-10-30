"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export type NavLink = { href: string; label: string; short: string; group?: string };

export function AdminNav({ items }: { items: NavLink[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:pb-6">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((i, idx) => {
          const active = i.href === "/admin" ? path === "/admin" : path === i.href || path.startsWith(`${i.href}/`);
          const heading = i.group && i.group !== items[idx - 1]?.group ? i.group : null;
          return (
            <li key={i.href}>
              {heading && (
                <p className="smallcaps text-muted mt-4 mb-1 hidden px-3 text-[0.7rem] lg:group-data-[sidebar=open]/admin:block">
                  {heading}
                </p>
              )}
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                title={i.label}
                className={clsx(
                  "flex items-center gap-3 rounded-sm px-3 py-1.5 text-[0.9rem] whitespace-nowrap transition-colors",
                  active ? "bg-bg text-fg" : "text-muted hover:bg-bg hover:text-fg",
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx("inline-block size-1.5 shrink-0 rotate-45", active ? "bg-thread" : "bg-transparent")}
                />
                <span className="lg:group-data-[sidebar=collapsed]/admin:sr-only">{i.label}</span>
                <span
                  aria-hidden="true"
                  className="smallcaps hidden text-[0.78rem] lg:group-data-[sidebar=collapsed]/admin:inline"
                >
                  {i.short}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
