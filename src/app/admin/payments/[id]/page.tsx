import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { FEE_LABEL, LEDGER_COLUMNS, type LedgerRow } from "@/lib/finance";
import { formatDate, formatNaira, isoDateFromNow } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { StatusBadge } from "../StatusBadge";
import { confirmTransfer } from "../../finance-actions";
import { RefundForm } from "./RefundForm";
import { RejectTransferForm } from "./TransferForms";

export const metadata = { title: "Payment" };

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(["super_admin", "finance_officer", "editor"], "/admin/payments");
  const { id } = await params;
  const db = await userClient();
  const { data: p } = await db.from("payment_ledger").select(LEDGER_COLUMNS).eq("id", id).maybeSingle<LedgerRow>();
  if (!p) notFound();
  const [{ data: refunds }, { data: flags }, { data: transfer }] = await Promise.all([
    db
      .from("refunds")
      .select("id, amount_kobo, reason, refunded_on, paystack_refund_reference, created_at, by:profiles ( full_name )")
      .eq("payment_id", id)
      .order("created_at"),
    db.from("reconciliation_flags").select("id, kind, run_date, resolved_at").eq("payment_id", id),
    db
      .from("payments")
      .select(
        "proof_path, proof_name, transfer_payer, transfer_date, proof_submitted_at, confirmed_at, rejection_reason, confirmer:profiles!payments_confirmed_by_fkey ( full_name )",
      )
      .eq("id", id)
      .maybeSingle(),
  ]);
  const awaiting = p.status === "pending" && !!transfer?.proof_submitted_at;
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
  if (transfer?.proof_submitted_at) {
    rows.push(["Paid in by", transfer.transfer_payer ?? "—"]);
    rows.push(["Transfer date", transfer.transfer_date ? formatDate(transfer.transfer_date) : "—"]);
    rows.push(["Receipt sent", formatDate(transfer.proof_submitted_at)]);
    if (transfer.confirmed_at)
      rows.push([
        "Confirmed",
        `${formatDate(transfer.confirmed_at)} by ${(transfer.confirmer as unknown as { full_name: string } | null)?.full_name ?? "—"}`,
      ]);
    if (transfer.rejection_reason) rows.push(["Not accepted", transfer.rejection_reason]);
  }

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
          canRefund && awaiting ? (
            <ActionButton
              variant="primary"
              run={confirmTransfer.bind(null, p.id)}
              confirm={{
                title: `Confirm ${formatNaira(p.amount_kobo)} received?`,
                description:
                  "Only confirm once the transfer shows on the journal’s bank statement. The payment is recorded as paid, the author is emailed an official receipt and the submission moves on.",
                confirmLabel: "Confirm payment",
              }}
            >
              Confirm payment received
            </ActionButton>
          ) : p.receipt_number ? (
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
          {transfer?.proof_path && (
            <section className="admin-box" aria-labelledby="proof">
              <h2 id="proof" className="font-display text-[1.15rem]">
                Proof of payment
              </h2>
              <p className="text-muted mt-1 text-[0.9rem]">
                Check the amount, the date and the description ({p.public_id}) against the journal’s bank statement
                before confirming.
              </p>
              <a
                href={`/api/payment-proofs/${p.id}`}
                target="_blank"
                rel="noopener"
                className="btn-line mt-3 inline-block"
              >
                Open the transfer receipt{transfer.proof_name ? ` (${transfer.proof_name})` : ""}
              </a>
            </section>
          )}
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
          {!!flags?.filter((f) => !f.resolved_at).length && (
            <p className="text-thread-text text-[0.9rem]">
              This payment was flagged by an earlier Paystack check ({flags.map((f) => f.kind).join(", ")}).
            </p>
          )}
        </div>
        <aside className="col-span-12 space-y-6 xl:col-span-5">
          {canRefund && awaiting && (
            <section className="admin-box" aria-labelledby="rej">
              <h2 id="rej" className="font-display text-[1.15rem]">
                Can’t find this transfer?
              </h2>
              <p className="text-muted mt-1 mb-4 text-[0.86rem]">
                If the money hasn’t reached the account, or the receipt doesn’t match, tell the author why. They can
                then upload the right receipt.
              </p>
              <RejectTransferForm paymentId={p.id} />
            </section>
          )}
          {canRefund && refundable > 0 ? (
            <section className="admin-box" aria-labelledby="rec">
              <h2 id="rec" className="font-display text-[1.15rem]">
                Record a refund
              </h2>
              <p className="text-muted mt-1 mb-4 text-[0.86rem]">
                Transfer the money back to the author from the journal’s account first, then record it here. Up to{" "}
                {formatNaira(refundable)} can be refunded.
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
