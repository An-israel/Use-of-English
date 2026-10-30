import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/lib/auth-actions";
import type { Viewer } from "@/lib/auth";
import { ROLE_LABEL, type Role } from "@/lib/workflow";
import { AdminCommand, type QuickAction } from "./AdminCommand";
import { AdminFrame } from "./AdminFrame";
import { AdminNav } from "./AdminNav";

export type AdminNavItem = { href: string; label: string; short: string; group?: string; roles: Role[] };

const STAFF: Role[] = ["super_admin", "editor", "book_review_editor", "finance_officer"];
const EDITORS: Role[] = ["super_admin", "editor"];
const CONTENT: Role[] = ["super_admin", "editor", "book_review_editor"];

/** Each section lists the roles that may open it; pages check again on the server. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", short: "Ov", roles: STAFF },
  { href: "/admin/submissions", label: "Submissions", short: "Sub", group: "Editorial", roles: STAFF },
  { href: "/admin/messages", label: "Messages", short: "Msg", group: "Editorial", roles: EDITORS },
  { href: "/admin/issues", label: "Issues", short: "Iss", group: "Publishing", roles: EDITORS },
  { href: "/admin/articles", label: "Articles", short: "Art", group: "Publishing", roles: EDITORS },
  { href: "/admin/in-press", label: "Articles in Press", short: "IP", group: "Publishing", roles: EDITORS },
  { href: "/admin/book-reviews", label: "Book reviews", short: "BR", group: "Publishing", roles: CONTENT },
  { href: "/admin/categories", label: "Categories", short: "Cat", group: "Journal", roles: EDITORS },
  { href: "/admin/call-for-papers", label: "Call for Papers", short: "CfP", group: "Journal", roles: EDITORS },
  { href: "/admin/pages", label: "Pages and policies", short: "Pg", group: "Journal", roles: EDITORS },
  { href: "/admin/board", label: "Editorial board", short: "Brd", group: "Journal", roles: EDITORS },
  { href: "/admin/users", label: "Users and roles", short: "Usr", group: "Office", roles: CONTENT },
  { href: "/admin/settings", label: "Settings", short: "Set", group: "Office", roles: ["super_admin"] },
];

const CREATE: (QuickAction & { roles: Role[] })[] = [
  { group: "Create", label: "New article", href: "/admin/articles/new", roles: EDITORS, keywords: "add" },
  { group: "Create", label: "New book review", href: "/admin/articles/new?type=book_review", roles: CONTENT },
  {
    group: "Create",
    label: "Create the next issue",
    href: "/admin/issues?create=next",
    roles: EDITORS,
    keywords: "volume",
  },
  { group: "Create", label: "Invite a reviewer or editor", href: "/admin/users", roles: CONTENT, keywords: "user" },
  { group: "Create", label: "Add a board member", href: "/admin/board?new=1", roles: EDITORS },
];

export function AdminShell({ viewer, banner, children }: { viewer: Viewer; banner?: ReactNode; children: ReactNode }) {
  const items = ADMIN_NAV.filter((i) => i.roles.includes(viewer.role));
  const actions: QuickAction[] = [
    ...items.map((i) => ({ group: "Go to" as const, label: i.label, href: i.href })),
    ...CREATE.filter((c) => c.roles.includes(viewer.role)).map(({ group, label, href, keywords }) => ({
      group,
      label,
      href,
      keywords,
    })),
    { group: "Go to", label: "View the public site", href: "/" },
  ];
  return (
    <AdminFrame
      banner={banner}
      nav={<AdminNav items={items.map(({ href, label, short, group }) => ({ href, label, short, group }))} />}
      footer={
        <>
          <p className="truncate">{viewer.fullName || viewer.email}</p>
          <p className="text-muted">{ROLE_LABEL[viewer.role]}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/" className="text-muted hover:text-fg">
              View site ↗
            </Link>
            <Link href="/account" className="text-muted hover:text-fg">
              My account
            </Link>
            <form action={signOut}>
              <button type="submit" className="text-muted hover:text-fg">
                Sign out
              </button>
            </form>
          </div>
        </>
      }
    >
      {children}
      <AdminCommand actions={actions} />
    </AdminFrame>
  );
}
