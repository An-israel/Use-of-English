import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { FEE_LABEL, fundByYear, parseFilters, totals, type FeeType } from "@/lib/finance";
import { allLedgerRows } from "@/lib/finance-data";
import { formatNaira } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";

export const metadata = { title: "Fund summary" };

/** Totals collected, refunds and net (brief section 7.3), for the transparency the proposal asks for. */
export default async function FundSummaryPage() {
  const viewer = await requireRole(["super_admin", "finance_officer", "editor"], "/admin/fund-summary");
  const db = await userClient();
  const [rows, { data: refunds }] = await Promise.all([
    allLedgerRows(db, parseFilters({})),
    db.from("refunds").select("amount_kobo, refunded_on"),
  ]);
  const t = totals(rows);
  const years = fundByYear(rows, refunds ?? []);
  const canExport = ["super_admin", "finance_officer"].includes(viewer.role);
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Fund summary"
        description="All fees received since the journal began, refunds and the net fund. Honoraria are a committee matter and are not calculated here."
        actions={
          canExport ? (
            <>
              <a href="/api/finance/export?kind=fund&format=pdf" className="btn-primary" download>
                Fund statement (PDF)
              </a>
              <a href="/api/finance/export?kind=fund&format=csv" className="btn-line" download>
                CSV
              </a>
            </>
          ) : null
        }
      />
      <div className="space-y-6 px-5 py-8 lg:px-10">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Collected", t.all.collected, `${t.all.payments} payments`],
            ["Refunds", t.all.refunded, "Returned to authors"],
            ["Net fund", t.all.net, "Collected less refunds"],
          ].map(([label, kobo, hint]) => (
            <div key={label as string} className="admin-box">
              <dt className="smallcaps text-muted text-[0.76rem]">{label}</dt>
              <dd className="font-display tabular mt-1 text-[1.8rem] leading-none sm:text-[2.3rem]">
                {formatNaira(kobo as number)}
              </dd>
              <dd className="text-muted mt-2 text-[0.8rem]">{hint}</dd>
            </div>
          ))}
        </dl>
        <div className="grid grid-cols-12 gap-6">
          <section className="admin-box col-span-12 lg:col-span-8" aria-labelledby="yr">
            <h2 id="yr" className="font-display text-[1.15rem]">
              By year
            </h2>
            <p className="text-muted mt-1 text-[0.82rem]">
              Fees count in the year paid; refunds in the year they were made.
            </p>
            {!years.length ? (
              <p className="text-muted mt-3 text-[0.9rem]">No fees received yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {["Year", "Payments", "Collected", "Refunds", "Net", "Waived"].map((h, i) => (
                        <th key={h} scope="col" className={i ? "text-right" : undefined}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {years.map((y) => (
                      <tr key={y.year}>
                        <td>{y.year}</td>
                        <td className="tabular text-right">{y.payments}</td>
                        <td className="tabular text-right">{formatNaira(y.collected)}</td>
                        <td className="tabular text-right">{y.refunded ? formatNaira(y.refunded) : "—"}</td>
                        <td className="tabular text-right font-medium">{formatNaira(y.net)}</td>
                        <td className="tabular text-right">{y.waived}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className="admin-box col-span-12 lg:col-span-4" aria-labelledby="fee">
            <h2 id="fee" className="font-display text-[1.15rem]">
              By fee
            </h2>
            <dl className="mt-3 space-y-4">
              {(Object.keys(FEE_LABEL) as FeeType[]).map((k) => (
                <div key={k} className="border-rule border-b pb-3 last:border-0">
                  <dt className="text-[0.92rem] font-medium">{FEE_LABEL[k]}</dt>
                  <dd className="font-display tabular mt-1 text-[1.3rem]">{formatNaira(t.byFee[k].net)}</dd>
                  <dd className="text-muted text-[0.82rem]">
                    {t.byFee[k].payments} paid · {t.byFee[k].waived} waived
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}
