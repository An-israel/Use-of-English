import Link from "next/link";
import clsx from "clsx";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TrafficChart } from "@/components/admin/TrafficChart";
import { RANGES, addDays, dailySeries, topArticles, weekly, type DailyRow, type RangeKey } from "@/lib/analytics";
import { requireRole } from "@/lib/auth";
import { parseFilters, totals } from "@/lib/finance";
import { allLedgerRows } from "@/lib/finance-data";
import { formatCount, formatDate, formatNaira, isoDateFromNow } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { STATUS_LABEL, STAFF_ROLES, type SubmissionStatus } from "@/lib/workflow";

export const metadata = { title: "Analytics" };

const PIPELINE: SubmissionStatus[] = [
  "submitted",
  "under_screening",
  "plagiarism_check",
  "under_peer_review",
  "revisions_requested",
  "revised_received",
  "accepted_awaiting_fee",
  "in_production",
  "published",
  "rejected",
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const viewer = await requireRole(STAFF_ROLES, "/admin/analytics");
  const sp = await searchParams;
  const range: RangeKey = sp.range && sp.range in RANGES ? (sp.range as RangeKey) : "90";
  const to = isoDateFromNow(0);
  const from = addDays(to, -(RANGES[range] - 1));
  const finance = viewer.role === "super_admin" || viewer.role === "finance_officer";
  const db = await userClient();

  const [daily, subs, ledger] = await Promise.all([
    db
      .from("metrics_daily")
      .select("day, article_id, views, downloads_pdf, downloads_docx")
      .gte("day", from)
      .lte("day", to)
      .limit(50_000)
      .returns<DailyRow[]>(),
    db.from("submissions").select("status, submitted_at, decided_at, accepted_at").neq("status", "draft").limit(5000),
    finance ? allLedgerRows(db, parseFilters({ from, to })) : Promise.resolve([]),
  ]);
  const rows = daily.data ?? [];
  const days = dailySeries(rows, from, to);
  const points = range === "365" ? weekly(days) : days;
  const views = days.reduce((s, p) => s + p.views, 0);
  const downloads = days.reduce((s, p) => s + p.downloads, 0);
  const top = topArticles(rows, 10);
  const { data: titles } = top.length
    ? await db
        .from("articles")
        .select("id, title, slug")
        .in(
          "id",
          top.map((t) => t.id),
        )
    : { data: [] as { id: string; title: string; slug: string }[] };
  const titleOf = new Map((titles ?? []).map((t) => [t.id, t]));
  const topMax = Math.max(1, ...top.map((t) => t.views));

  const s = subs.data ?? [];
  const count = (st: SubmissionStatus) => s.filter((r) => r.status === st).length;
  const accepted = s.filter((r) => ["accepted_awaiting_fee", "in_production", "published"].includes(r.status)).length;
  const rejected = count("rejected");
  const decided = s.filter((r) => (r.decided_at || r.accepted_at) && r.submitted_at);
  const avgDays = decided.length
    ? Math.round(
        decided.reduce(
          (sum, r) =>
            sum +
            Math.max(0, Date.parse(r.decided_at ?? `${r.accepted_at}T12:00:00Z`) - Date.parse(r.submitted_at!)) /
              86_400_000,
          0,
        ) / decided.length,
      )
    : null;
  const pipeMax = Math.max(1, ...PIPELINE.map(count));
  const money = finance ? totals(ledger).all : null;
  const tab = (on: boolean) => clsx("px-3 py-1.5", on ? "bg-fg text-bg" : "text-muted hover:text-fg");

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Analytics"
        description="Reading and the editorial pipeline. Views count once per reader per article per day; bots and crawlers are not counted."
      />
      <div className="space-y-6 px-5 py-6 lg:px-10">
        <nav aria-label="Period" className="flex flex-wrap items-center gap-3 text-[0.86rem]">
          <div className="border-rule flex rounded-sm border">
            {(Object.keys(RANGES) as RangeKey[]).map((k) => (
              <Link
                key={k}
                href={`/admin/analytics?range=${k}`}
                className={tab(range === k)}
                aria-current={range === k ? "page" : undefined}
              >
                {k === "365" ? "Last 12 months" : `Last ${k} days`}
              </Link>
            ))}
          </div>
          <span className="text-muted">
            {formatDate(from)} to {formatDate(to)}
          </span>
        </nav>

        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Article views", formatCount(views), "In this period"],
            ["Downloads", formatCount(downloads), "PDF and Word, in this period"],
            [
              "Acceptance rate",
              accepted + rejected ? `${Math.round((accepted / (accepted + rejected)) * 100)}%` : "—",
              `${accepted} accepted · ${rejected} rejected, all time`,
            ],
            ["Days to decision", avgDays ?? "—", "Average, submission to accept or reject"],
          ].map(([label, value, hint]) => (
            <div key={label as string} className="admin-box">
              <dt className="smallcaps text-muted text-[0.76rem]">{label}</dt>
              <dd className="font-display tabular mt-1 text-[1.55rem] leading-none sm:text-[2rem]">{value}</dd>
              <dd className="text-muted mt-2 text-[0.8rem]">{hint}</dd>
            </div>
          ))}
        </dl>

        <section className="admin-box" aria-labelledby="traffic">
          <h2 id="traffic" className="font-display text-[1.2rem]">
            Views and downloads {range === "365" ? "by week" : "by day"}
          </h2>
          <div className="mt-4">
            <TrafficChart points={points} />
          </div>
          <details className="mt-4 text-[0.86rem]">
            <summary className="text-muted cursor-pointer">Show as a table</summary>
            <div className="mt-3 max-h-80 overflow-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">{range === "365" ? "Week from" : "Day"}</th>
                    <th scope="col" className="text-right">
                      Views
                    </th>
                    <th scope="col" className="text-right">
                      Downloads
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...points].reverse().map((p) => (
                    <tr key={p.day}>
                      <td className="tabular">{formatDate(p.day)}</td>
                      <td className="tabular text-right">{formatCount(p.views)}</td>
                      <td className="tabular text-right">{formatCount(p.downloads)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <div className="grid grid-cols-12 gap-6">
          <section className="admin-box col-span-12 lg:col-span-7" aria-labelledby="top">
            <h2 id="top" className="font-display text-[1.2rem]">
              Most-read articles
            </h2>
            {!top.length ? (
              <p className="text-muted mt-3 text-[0.9rem]">No reading recorded in this period.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {top.map((t, i) => {
                  const a = titleOf.get(t.id);
                  return (
                    <li key={t.id} className="grid grid-cols-[1.5rem_1fr] gap-x-2 text-[0.88rem]">
                      <span className="tabular text-muted pt-0.5">{i + 1}</span>
                      <div className="min-w-0">
                        <Link
                          href={a ? `/admin/articles/${t.id}` : "#"}
                          className="line-clamp-1 font-medium hover:underline hover:underline-offset-4"
                        >
                          {a?.title ?? "Removed article"}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="bg-bg block h-2 flex-1 overflow-hidden rounded-full" aria-hidden="true">
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${(t.views / topMax) * 100}%`, background: "var(--chart-views)" }}
                            />
                          </span>
                          <span className="tabular text-muted shrink-0 text-right text-[0.8rem] whitespace-nowrap">
                            <strong className="text-fg font-semibold">{formatCount(t.views)}</strong> views ·{" "}
                            {formatCount(t.downloads)} dl
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="admin-box col-span-12 lg:col-span-5" aria-labelledby="pipe">
            <h2 id="pipe" className="font-display text-[1.2rem]">
              Submissions by status
            </h2>
            <ul className="mt-4 space-y-2.5">
              {PIPELINE.map((st) => (
                <li key={st}>
                  <Link
                    href={`/admin/submissions?status=${st}`}
                    className="group grid grid-cols-[10rem_1fr_2rem] items-center gap-3 text-[0.84rem]"
                  >
                    <span className="text-muted group-hover:text-fg truncate">{STATUS_LABEL[st]}</span>
                    <span className="bg-bg h-2 overflow-hidden rounded-full" aria-hidden="true">
                      <span
                        className="bg-thread block h-full rounded-full"
                        style={{ width: `${(count(st) / pipeMax) * 100}%` }}
                      />
                    </span>
                    <span className="tabular text-right">{count(st)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {money && (
          <section className="admin-box" aria-labelledby="pay">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="pay" className="font-display text-[1.2rem]">
                Payments in this period
              </h2>
              <Link
                href={`/admin/payments?from=${from}&to=${to}`}
                className="text-thread-text text-[0.86rem] hover:underline"
              >
                Open payments →
              </Link>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-4 text-[0.9rem] sm:grid-cols-4">
              {[
                ["Collected", formatNaira(money.collected)],
                ["Refunded", formatNaira(money.refunded)],
                ["Net", formatNaira(money.net)],
                ["Waived", String(money.waived)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-display tabular text-[1.35rem]">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
