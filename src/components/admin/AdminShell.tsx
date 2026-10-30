import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth-actions";
import type { Viewer } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/workflow";
import { AdminNav } from "./AdminNav";

export type AdminNavItem = { href: string; label: string; roles: Role[] };

/** Sections are added milestone by milestone; each lists the roles that may open it. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", roles: ["super_admin", "editor", "book_review_editor", "finance_officer"] },
  { href: "/admin/users", label: "Users and roles", roles: ["super_admin", "editor", "book_review_editor"] },
];

export function AdminShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const items = ADMIN_NAV.filter((i) => i.roles.includes(viewer.role));
  return (
    <div className="bg-bg flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#admin-main"
        className="bg-brand text-brand-fg fixed top-3 left-4 z-[70] -translate-y-24 rounded-sm px-4 py-2 focus:translate-y-0"
      >
        Skip to content
      </a>
      <aside className="border-rule bg-surface border-b lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-5 lg:block">
          <Link href="/admin" className="block leading-none">
            <span className="font-display text-[1.5rem] font-semibold tracking-[-0.02em]">JHTS</span>
            <span className="smallcaps text-muted mt-1 block text-[0.72rem]">Editorial office</span>
          </Link>
          <Link href="/" className="text-muted hover:text-fg text-[0.85rem] lg:mt-4 lg:inline-block">
            View site ↗
          </Link>
        </div>
        <AdminNav items={items} />
        <div className="border-rule hidden border-t px-5 py-5 text-[0.85rem] lg:absolute lg:inset-x-0 lg:bottom-0 lg:block">
          <p className="truncate">{viewer.fullName || viewer.email}</p>
          <p className="text-muted">{ROLE_LABEL[viewer.role]}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/account" className="text-muted hover:text-fg">
              My account
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-muted hover:text-fg">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </main>
    </div>
  );
}
