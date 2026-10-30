import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/journal/EmptyState";
import { Pagination } from "@/components/journal/Pagination";
import { ADMIN_PAGE_SIZE, pageOf, range, withParams } from "@/lib/admin/query";
import { requireRole } from "@/lib/auth";
import {
  FEE_LABEL,
  PAYMENT_STATUS_LABEL,
  filtersToQuery,
  monthLabel,
  parseFilters,
  totals,
  type LedgerRow,
} from "@/lib/finance";
import { allLedgerRows, issueOptions, ledgerQuery } from "@/lib/finance-data";
import { formatDate, formatNaira } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { StatusBadge } from "./StatusBadge";

export const metadata = { title: "Payments" };

const FINANCE = ["super_admin", "finance_officer"] as const;

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const viewer = await requireRole(["super_admin", "finance_officer", "editor"], "/admin/payments");
  const sp = await searchParams;
  const f = parseFilters(sp);
  const page = pageOf(sp.page);
  const db = await userClient();
  const [{ data, count }, all, issues] = await Promise.all([
    ledgerQuery(db, f, { count: true })
      .range(...range(page))
      .returns<LedgerRow[]>(),
    allLedgerRows(db, f),
    issueOptions(db),
  ]);
  const rows = data ?? [];
  const t = totals(all);
  const query = filtersToQuery(f);
  const canExport = (FINANCE as readonly string[]).includes(viewer.role);
  const current = { ...sp, page: undefined };

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Payments"
        description={
          canExport
            ? "Every fee payment, waiver and refund. Amounts are those charged at the time of payment."
            : "Every fee payment, waiver and refund. Editors can view; the Finance Officer records refunds and exports reports."
        }
        actions={
          canExport ? (
            <>
              <a href={`/api/finance/export?format=csv&${query}`} className="btn-line" download>
                Export CSV
              </a>
              <a href={`/api/finance/export?format=pdf&${query}`} className="btn-line" download>
                Export PDF
              </a>
            </>
          ) : null
        }
      />
      <div className="space-y-6 px-5 py-6 lg:px-10">
        <form action="/admin/payments" className="flex flex-wrap items-end gap-3" aria-label="Filter payments">
          <label className="admin-label">
            From
            <input type="date" name="from" defaultValue={f.from ?? ""} className="admin-input" />
          </label>
          <label className="admin-label">
            To
            <input type="date" name="to" defaultValue={f.to ?? ""} className="admin-input" />
          </label>
          <label className="admin-label">
            Fee
            <select name="fee" defaultValue={f.fee ?? ""} className="admin-input">
              <option value="">All fees</option>
              {Object.entries(FEE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label">
            Status
            <select name="status" defaultValue={f.status ?? ""} className="admin-input">
              <option value="">All statuses</option>
              {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label min-w-[14rem]">
            Issue
            <select name="issue" defaultValue={f.issue ?? ""} className="admin-input">
              <option value="">Any issue</option>
              {issues.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-line">
            Apply
          </button>
          {query && (
            <Link href="/admin/payments" className="btn-quiet">
              Clear
            </Link>
          )}
        </form>

        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Collected", formatNaira(t.all.collected), `${t.all.payments} payment${t.all.payments === 1 ? "" : "s"}`],
            ["Refunded", formatNaira(t.all.refunded), "Recorded refunds"],
            ["Net", formatNaira(t.all.net), "Collected less refunds"],
            ["Waived", String(t.all.waived), "Fees waived by the editors"],
          ].map(([label, value, hint]) => (
            <div key={label} className="admin-box">
              <dt className="smallcaps text-muted text-[0.76rem]">{label}</dt>
              <dd className="font-display tabular mt-1 text-[1.55rem] leading-none sm:text-[1.9rem]">{value}</dd>
              <dd className="text-muted mt-2 text-[0.8rem]">{hint}</dd>
            </div>
          ))}
        </dl>
        {query && <p className="text-muted -mt-3 text-[0.82rem]">Totals reflect the filters above.</p>}

        <div className="grid grid-cols-12 gap-6">
          <section className="admin-box col-span-12 lg:col-span-7" aria-labelledby="bm">
            <h2 id="bm" className="font-display text-[1.15rem]">
              By month
            </h2>
            {!t.byMonth.length ? (
              <p className="text-muted mt-3 text-[0.9rem]">No payments in this range.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Month</th>
                      <th scope="col" className="text-right">
                        Payments
                      </th>
                      <th scope="col" className="text-right">
                        Collected
                      </th>
                      <th scope="col" className="text-right">
                        Refunded
                      </th>
                      <th scope="col" className="text-right">
                        Net
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.byMonth.map((m) => (
                      <tr key={m.month}>
                        <td>{monthLabel(m.month)}</td>
                        <td className="tabular text-right">{m.payments}</td>
                        <td className="tabular text-right">{formatNaira(m.collected)}</td>
                        <td className="tabular text-right">{m.refunded ? formatNaira(m.refunded) : "—"}</td>
                        <td className="tabular text-right font-medium">{formatNaira(m.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="admin-box col-span-12 lg:col-span-5" aria-labelledby="bf">
            <h2 id="bf" className="font-display text-[1.15rem]">
              By fee type
            </h2>
            <dl className="mt-3 space-y-4">
              {(Object.keys(FEE_LABEL) as (keyof typeof FEE_LABEL)[]).map((k) => (
                <div key={k} className="border-rule border-b pb-3 last:border-0">
                  <dt className="text-[0.92rem] font-medium">{FEE_LABEL[k]}</dt>
                  <dd className="text-muted tabular mt-1 text-[0.86rem]">
                    {t.byFee[k].payments} paid · {formatNaira(t.byFee[k].collected)} collected ·{" "}
                    {formatNaira(t.byFee[k].net)} net · {t.byFee[k].waived} waived
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {!rows.length ? (
          <EmptyState title="No payments match">Try a wider date range or clear the filters.</EmptyState>
        ) : (
          <>
            <ul
              className="border-rule bg-surface divide-rule divide-y rounded-[3px] border sm:hidden"
              aria-label="Payments"
            >
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/admin/payments/${r.id}`}
                      className="tabular text-[0.88rem] font-medium underline-offset-4 hover:underline"
                    >
                      {r.reference}
                    </Link>
                    <span className="tabular text-[0.92rem]">{formatNaira(r.amount_kobo)}</span>
                  </div>
                  <div className="text-muted mt-1 flex items-center justify-between gap-3 text-[0.8rem]">
                    <span className="truncate">
                      {FEE_LABEL[r.fee_type]} · {r.payer_name || r.payer_email}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="tabular text-muted mt-0.5 text-[0.78rem]">
                    {formatDate(r.activity_at)}
                    {r.refunded_kobo > 0 && (
                      <span className="text-accent"> · −{formatNaira(r.refunded_kobo)} refunded</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
            <div className="border-rule bg-surface hidden overflow-x-auto rounded-[3px] border sm:block">
              <table className="admin-table min-w-[60rem]">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Payer and submission</th>
                    <th scope="col">Fee</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-right">
                      Amount
                    </th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular whitespace-nowrap">
                        <Link
                          href={`/admin/payments/${r.id}`}
                          className="font-medium hover:underline hover:underline-offset-4"
                        >
                          {r.reference}
                        </Link>
                        {r.receipt_number && (
                          <span className="text-muted block text-[0.78rem]">{r.receipt_number}</span>
                        )}
                      </td>
                      <td>
                        {r.payer_name || r.payer_email}
                        <span className="text-muted block text-[0.8rem]">
                          {r.public_id} · {r.title}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">{FEE_LABEL[r.fee_type]}</td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="tabular text-right whitespace-nowrap">
                        {formatNaira(r.amount_kobo)}
                        {r.refunded_kobo > 0 && (
                          <span className="text-accent block text-[0.78rem]">
                            −{formatNaira(r.refunded_kobo)} refunded
                          </span>
                        )}
                      </td>
                      <td className="tabular text-muted whitespace-nowrap">{formatDate(r.activity_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pages={Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)}
              href={(p) => withParams("/admin/payments", current, { page: String(p) })}
            />
          </>
        )}
      </div>
    </>
  );
}
