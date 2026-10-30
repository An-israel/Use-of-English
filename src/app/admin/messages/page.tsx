import Link from "next/link";
import clsx from "clsx";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/journal/EmptyState";
import { Pagination } from "@/components/journal/Pagination";
import { ADMIN_PAGE_SIZE, pageOf, range } from "@/lib/admin/query";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { markMessage } from "../journal-actions";

export const metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["super_admin", "editor"], "/admin/messages");
  const sp = await searchParams;
  const archived = sp.box === "archived";
  const page = pageOf(sp.page);
  let q = (await userClient())
    .from("contact_messages")
    .select("id, name, email, subject, message, is_read, archived_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...range(page));
  q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  const { data, count } = await q;
  const rows = data ?? [];
  const tab = (on: boolean) => clsx("px-3 py-1.5", on ? "bg-fg text-bg" : "text-muted hover:text-fg");
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Messages"
        description="Messages sent through the contact form. Reply from your email; the sender’s address is used as reply-to."
        actions={
          <div role="group" aria-label="Mailbox" className="border-rule flex rounded-sm border text-[0.86rem]">
            <Link href="/admin/messages" className={tab(!archived)} aria-current={!archived ? "page" : undefined}>
              Inbox
            </Link>
            <Link
              href="/admin/messages?box=archived"
              className={tab(archived)}
              aria-current={archived ? "page" : undefined}
            >
              Archived
            </Link>
          </div>
        }
      />
      <div className="max-w-[60rem] space-y-4 px-5 py-6 lg:px-10">
        {!rows.length ? (
          <EmptyState title={archived ? "Nothing archived" : "The inbox is empty"}>
            New contact-form messages appear here.
          </EmptyState>
        ) : (
          rows.map((m) => (
            <article key={m.id} className={clsx("admin-box", !m.is_read && "border-l-thread border-l-2")}>
              <header className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-[1rem] font-medium">
                  {!m.is_read && <span className="sr-only">Unread: </span>}
                  {m.subject}
                </h2>
                <span className="tabular text-muted text-[0.82rem]">{formatDate(m.created_at)}</span>
              </header>
              <p className="text-muted text-[0.86rem]">
                {m.name} · {m.email}
              </p>
              <p className="mt-3 text-[0.94rem] whitespace-pre-line">{m.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="btn-line">
                  Reply by email
                </a>
                {!archived && (
                  <ActionButton variant="quiet" run={markMessage.bind(null, m.id, m.is_read ? "unread" : "read")}>
                    {m.is_read ? "Mark unread" : "Mark read"}
                  </ActionButton>
                )}
                <ActionButton variant="quiet" run={markMessage.bind(null, m.id, archived ? "unarchive" : "archive")}>
                  {archived ? "Move to inbox" : "Archive"}
                </ActionButton>
              </div>
            </article>
          ))
        )}
        <Pagination
          page={page}
          pages={Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)}
          href={(p) => `/admin/messages?${archived ? "box=archived&" : ""}page=${p}`}
        />
      </div>
    </>
  );
}
