"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function AdminNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="overflow-x-auto px-3 pb-3 lg:px-3 lg:pb-0">
      <ul className="flex gap-1 lg:flex-col">
        {items.map((i) => {
          const active = i.href === "/admin" ? path === "/admin" : path.startsWith(i.href);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-sm px-3 py-2 text-[0.92rem] whitespace-nowrap transition-colors",
                  active ? "bg-bg text-fg" : "text-muted hover:bg-bg hover:text-fg",
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx("inline-block size-1.5 rotate-45", active ? "bg-thread" : "bg-transparent")}
                />
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
