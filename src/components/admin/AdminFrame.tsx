"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import clsx from "clsx";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { OPEN_ADMIN_COMMAND } from "./AdminCommand";

const KEY = "jhts-admin-sidebar";
const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) === "collapsed";
  } catch {
    return false;
  }
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
function setCollapsed(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "collapsed" : "open");
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
  listeners.forEach((l) => l());
}

/** The admin frame: a sidebar that collapses on wide screens (remembered per browser). */
export function AdminFrame({
  nav,
  footer,
  banner,
  children,
}: {
  nav: ReactNode;
  footer: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const collapsed = useSyncExternalStore(subscribe, read, () => false);
  return (
    <div
      className="group/admin bg-bg flex min-h-dvh flex-col lg:flex-row"
      data-sidebar={collapsed ? "collapsed" : "open"}
    >
      <a
        href="#admin-main"
        className="bg-brand text-brand-fg fixed top-3 left-4 z-[70] -translate-y-24 rounded-sm px-4 py-2 focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside
        className={clsx(
          "border-rule bg-surface border-b lg:sticky lg:top-0 lg:flex lg:h-dvh lg:shrink-0 lg:flex-col lg:border-r lg:border-b-0",
          collapsed ? "lg:w-[4.25rem]" : "lg:w-64",
        )}
      >
        <div className={clsx("flex items-center justify-between gap-2 px-5 py-5", collapsed && "lg:flex-col lg:px-2")}>
          <Link href="/admin" className="block leading-none" aria-label="JHTS editorial office">
            <span className="font-display text-[1.5rem] font-semibold tracking-[-0.02em]">
              {collapsed ? <span className="lg:text-[1.1rem]">J</span> : "JHTS"}
            </span>
            {!collapsed && <span className="smallcaps text-muted mt-1 block text-[0.72rem]">Editorial office</span>}
          </Link>
          <div className={clsx("flex items-center gap-1", collapsed && "lg:flex-col")}>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_ADMIN_COMMAND))}
              className="text-muted hover:text-fg rounded-sm px-2 py-1 text-[0.78rem]"
              title="Quick actions (Ctrl or ⌘ + K)"
              aria-label="Quick actions"
            >
              <kbd className="border-rule rounded-[2px] border px-1.5 py-0.5 font-sans">⌘K</kbd>
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="text-muted hover:text-fg hidden rounded-sm p-2 lg:inline-flex"
              aria-label={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
            >
              <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
            </button>
          </div>
        </div>
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">{nav}</div>
        <div
          className={clsx("border-rule hidden border-t px-5 py-4 text-[0.85rem] lg:block", collapsed && "lg:hidden")}
        >
          {footer}
        </div>
      </aside>
      <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {banner}
        {children}
      </main>
    </div>
  );
}
