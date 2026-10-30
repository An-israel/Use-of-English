import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { FEE_LABEL, LEDGER_COLUMNS, type LedgerRow } from "@/lib/finance";
import { formatDate, formatNaira, isoDateFromNow } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { StatusBadge } from "../StatusBadge";
import { RefundForm } from "./RefundForm";

export const metadata = { title: "Payment" };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(["super_admin", "finance_officer", "editor"], "/admin/payments");
  const { id } = await params;
  const db = await userClient();
  const { data: p } = await db.from("payment_ledger").select(LEDGER_COLUMNS).eq("id", id).maybeSingle<LedgerRow>();
  if (!p) notFound();
  const [{ data: refunds }, { data: flags }] = await Promise.all([
    db
      .from("refunds")
      .select("id, amount_kobo, reason, refunded_on, paystack_refund_reference, created_at, by:profiles ( full_name )")
      .eq("payment_id", id)
      .order("created_at"),
    db.from("reconciliation_flags").select("id, kind, run_date, resolved_at").eq("payment_id", id),
  ]);
  const canRefund = ["super_admin", "finance_officer"].includes(viewer.role);
  const refundable = p.status === "success" ? p.amount_kobo - p.refunded_kobo : 0;
  const rows: [string, React.ReactNode][] = [
    ["Fee", FEE_LABEL[p.fee_type]],
    ["Amount", formatNaira(p.amount_kobo)],
    ["Refunded", p.refunded_kobo ? formatNaira(p.refunded_kobo) : "—"],
    ["Net", formatNaira(p.net_kobo)],
    ["Paid", p.paid_at ? formatDate(p.paid_at) : "—"],
    ["Started", formatDate(p.created_at)],
    ["Method", p.channel?.replace("_", " ") ?? "—"],
    ["Receipt", p.receipt_number ?? "—"],
    ["Payer", `${p.payer_name} (${p.payer_email})`],
    [
      "Submission",
      <Link key="s" href={`/admin/submissions/${p.submission_id}`} className="underline underline-offset-4">
        {p.public_id} · {p.title}
      </Link>,
    ],
  ];
  if (p.waiver_reason) rows.push(["Waiver reason", p.waiver_reason]);

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/payments", label: "Payments" },
        ]}
        title={p.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} /> {FEE_LABEL[p.fee_type]} · {formatNaira(p.amount_kobo)}
          </span>
        }
        actions={
          p.receipt_number ? (
            <a href={`/api/receipts/${p.id}`} className="btn-line">
              Download receipt
            </a>
          ) : null
        }
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <section className="admin-box" aria-labelledby="det">
            <h2 id="det" className="font-display text-[1.15rem]">
              Details
            </h2>
            <dl className="mt-3 grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-[0.92rem]">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{k}</dt>
                  <dd className="tabular">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="admin-box" aria-labelledby="rf">
            <h2 id="rf" className="font-display text-[1.15rem]">
              Refunds
            </h2>
            {!refunds?.length ? (
              <p className="text-muted mt-3 text-[0.9rem]">No refunds recorded.</p>
            ) : (
              <ul className="divide-rule mt-3 divide-y text-[0.92rem]">
                {refunds.map((r) => (
                  <li key={r.id} className="py-2.5">
                    <span className="tabular font-medium">{formatNaira(r.amount_kobo)}</span> on{" "}
                    {formatDate(r.refunded_on)}
                    {r.paystack_refund_reference && (
                      <span className="tabular text-muted"> · {r.paystack_refund_reference}</span>
                    )}
                    <span className="text-muted block">
                      {r.reason} · recorded by {(r.by as unknown as { full_name: string } | null)?.full_name ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {!!flags?.length && (
            <p className="text-thread-text text-[0.9rem]">
              This payment appears in {flags.length} reconciliation flag{flags.length === 1 ? "" : "s"}.{" "}
              <Link href="/admin/reconciliation" className="underline underline-offset-4">
                Open reconciliation
              </Link>
            </p>
          )}
        </div>
        <aside className="col-span-12 xl:col-span-5">
          {canRefund && refundable > 0 ? (
            <section className="admin-box" aria-labelledby="rec">
              <h2 id="rec" className="font-display text-[1.15rem]">
                Record a refund
              </h2>
              <p className="text-muted mt-1 mb-4 text-[0.86rem]">
                Refund the money in the Paystack dashboard first, then record it here. Up to {formatNaira(refundable)}{" "}
                can be refunded.
              </p>
              <RefundForm paymentId={p.id} maxNaira={refundable / 100} today={isoDateFromNow(0)} />
            </section>
          ) : (
            <p className="text-muted text-[0.9rem]">
              {canRefund
                ? "Only paid payments with a balance can be refunded."
                : "Refunds are recorded by the Finance Officer or a Super Admin."}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
