import Link from "next/link";
import type { ReactNode } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { daysSince, formatDate, formatNaira, isoDaysAgo } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { STATUS_LABEL, STAFF_ROLES, type SubmissionStatus } from "@/lib/workflow";

export const metadata = { title: "Overview" };

const OPEN: SubmissionStatus[] = [
  "submitted",
  "under_screening",
  "plagiarism_check",
  "under_peer_review",
  "revisions_requested",
  "revised_received",
  "accepted_awaiting_fee",
  "in_production",
];

export default async function AdminHome() {
  const viewer = await requireRole(STAFF_ROLES, "/admin");
  const db = await userClient();
  const editorial = viewer.role !== "finance_officer";
  const finance = viewer.role === "super_admin" || viewer.role === "finance_officer";
  const monthAgo = isoDaysAgo(30);
  const nowIso = isoDaysAgo(0);

  const [subs, overdue, unread, failed, flags, events, paid] = await Promise.all([
    db
      .from("submissions")
      .select("id, status, submitted_at, decided_at, accepted_at, updated_at")
      .neq("status", "draft")
      .limit(2000),
    editorial
      ? db
          .from("review_assignments")
          .select("id", { count: "exact", head: true })
          .in("status", ["invited", "accepted"])
          .lt("due_at", nowIso)
      : Promise.resolve({ count: 0 }),
    ["super_admin", "editor"].includes(viewer.role)
      ? db
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false)
          .is("archived_at", null)
      : Promise.resolve({ count: 0 }),
    db.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", monthAgo),
    finance
      ? db.from("reconciliation_flags").select("id", { count: "exact", head: true }).is("resolved_at", null)
      : Promise.resolve({ count: 0 }),
    db
      .from("submission_events")
      .select("id, to_status, message, visibility, created_at, submission:submissions ( id, public_id, title )")
      .order("created_at", { ascending: false })
      .limit(12),
    finance
      ? db.from("payments").select("amount_kobo").eq("status", "success").gte("paid_at", monthAgo)
      : Promise.resolve({ data: [] as { amount_kobo: number }[] }),
  ]);

  const rows = subs.data ?? [];
  const count = (s: SubmissionStatus) => rows.filter((r) => r.status === s).length;
  const decided = rows.filter((r) => r.decided_at || r.accepted_at);
  const accepted = rows.filter((r) =>
    ["accepted_awaiting_fee", "in_production", "published"].includes(r.status),
  ).length;
  const rejected = count("rejected");
  const avgDays = decided.length
    ? Math.round(
        decided.reduce(
          (sum, r) =>
            sum +
            Math.max(
              0,
              (Date.parse(r.decided_at ?? r.accepted_at!) -
                Date.parse(r.submitted_at ?? r.decided_at ?? r.accepted_at!)) /
                86_400_000,
            ),
          0,
        ) / decided.length,
      )
    : null;
  const open = rows.filter((r) => OPEN.includes(r.status as SubmissionStatus));
  const max = Math.max(1, ...OPEN.map(count));

  const attention: { href: string; label: string; n: number; tone?: "accent" }[] = [
    { href: "/admin/submissions?status=submitted", label: "New submissions to screen", n: count("submitted") },
    {
      href: "/admin/submissions?status=revised_received",
      label: "Revised manuscripts received",
      n: count("revised_received"),
    },
    ...(editorial
      ? [
          {
            href: "/admin/submissions?view=board",
            label: "Reviews past their due date",
            n: overdue.count ?? 0,
            tone: "accent" as const,
          },
        ]
      : []),
    {
      href: "/admin/submissions?status=accepted_awaiting_fee",
      label: "Accepted, awaiting publication fee",
      n: count("accepted_awaiting_fee"),
    },
    { href: "/admin/payments?status=failed", label: "Failed payments (30 days)", n: failed.count ?? 0, tone: "accent" },
    ...(finance
      ? [
          {
            href: "/admin/reconciliation",
            label: "Unresolved reconciliation flags",
            n: flags.count ?? 0,
            tone: "accent" as const,
          },
        ]
      : []),
    ...(["super_admin", "editor"].includes(viewer.role)
      ? [{ href: "/admin/messages", label: "Unread messages", n: unread.count ?? 0 }]
      : []),
  ];

  return (
    <>
      <AdminPageHeader
        title="Overview"
        description={`Good to see you${viewer.fullName ? `, ${viewer.fullName.split(" ").find((p) => !/^(prof|dr|assoc)\.?$/i.test(p))}` : ""}. Here is where the journal stands today.`}
      />
      <div className="space-y-8 px-5 py-8 lg:px-10">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label="Open submissions" value={open.length} hint="Submitted and not yet decided or published" />
          <Tile
            label="Acceptance rate"
            value={accepted + rejected ? `${Math.round((accepted / (accepted + rejected)) * 100)}%` : "—"}
            hint={`${accepted} accepted · ${rejected} rejected`}
          />
          <Tile label="Days to decision" value={avgDays ?? "—"} hint="Average, submission to accept or reject" />
          {finance ? (
            <Tile
              label="Fees received (30 days)"
              value={formatNaira((paid.data ?? []).reduce((s, p) => s + p.amount_kobo, 0))}
              hint={`${paid.data?.length ?? 0} payments`}
            />
          ) : (
            <Tile label="Published" value={count("published")} hint="Submissions now published" />
          )}
        </dl>

        <div className="grid grid-cols-12 gap-6">
          <section className="admin-box col-span-12 lg:col-span-5" aria-labelledby="na">
            <h2 id="na" className="font-display text-[1.2rem]">
              Needs attention
            </h2>
            <ul className="divide-rule mt-3 divide-y">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link href={a.href} className="group flex items-center justify-between gap-4 py-2.5 text-[0.92rem]">
                    <span className="group-hover:underline group-hover:underline-offset-4">{a.label}</span>
                    <span
                      className={`tabular min-w-8 rounded-full px-2 py-0.5 text-center text-[0.82rem] ${
                        a.n === 0 ? "text-muted" : a.tone === "accent" ? "bg-accent text-paper" : "bg-fg text-bg"
                      }`}
                    >
                      {a.n}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-box col-span-12 lg:col-span-7" aria-labelledby="pipe">
            <h2 id="pipe" className="font-display text-[1.2rem]">
              Submissions by status
            </h2>
            <ul className="mt-4 space-y-2.5">
              {OPEN.map((s) => (
                <li key={s}>
                  <Link
                    href={`/admin/submissions?status=${s}`}
                    className="group grid grid-cols-[11rem_1fr_2rem] items-center gap-3 text-[0.86rem]"
                  >
                    <span className="text-muted group-hover:text-fg truncate">{STATUS_LABEL[s]}</span>
                    <span className="bg-bg h-2.5 overflow-hidden rounded-full" aria-hidden="true">
                      <span
                        className="bg-thread block h-full rounded-full"
                        style={{ width: `${(count(s) / max) * 100}%` }}
                      />
                    </span>
                    <span className="tabular text-right">{count(s)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-muted mt-4 text-[0.8rem]">
              Views, downloads and trends over time arrive with the analytics charts.
            </p>
          </section>
        </div>

        <section className="admin-box" aria-labelledby="ra">
          <h2 id="ra" className="font-display text-[1.2rem]">
            Recent activity
          </h2>
          {!events.data?.length ? (
            <p className="text-muted mt-3 text-[0.9rem]">Nothing yet. Activity on submissions appears here.</p>
          ) : (
            <ol className="divide-rule mt-3 divide-y text-[0.9rem]">
              {events.data.map((e) => {
                const sub = e.submission as unknown as { id: string; public_id: string | null; title: string } | null;
                return (
                  <li key={e.id} className="grid gap-1 py-2.5 sm:grid-cols-[8rem_1fr]">
                    <span className="tabular text-muted text-[0.82rem]">{ago(e.created_at)}</span>
                    <span className="min-w-0">
                      {sub && (
                        <Link href={`/admin/submissions/${sub.id}`} className="font-medium hover:underline">
                          {sub.public_id ?? "Draft"}
                        </Link>
                      )}{" "}
                      {e.to_status ? (
                        <>→ {STATUS_LABEL[e.to_status as SubmissionStatus]}</>
                      ) : (
                        <span className="text-muted">{e.visibility === "internal" ? "internal note" : "message"}</span>
                      )}
                      {e.message && <span className="text-muted block truncate">{e.message}</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

function ago(iso: string): string {
  const d = daysSince(iso);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : d < 7 ? `${d} days ago` : formatDate(iso);
}

function Tile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="admin-box">
      <dt className="smallcaps text-muted text-[0.76rem]">{label}</dt>
      <dd className="font-display tabular mt-1 text-[1.55rem] leading-none break-words sm:text-[2rem]">{value}</dd>
      {hint && <dd className="text-muted mt-2 text-[0.8rem]">{hint}</dd>}
    </div>
  );
}
