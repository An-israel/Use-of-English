/**
 * Daily reconciliation (brief section 7.1, step 8): compare the day's
 * Paystack transactions with the payments table and describe every
 * mismatch. Pure, so every rule is unit-tested.
 */

export type DbPayment = {
  id: string;
  reference: string;
  status: string;
  amountKobo: number;
};

export type PaystackTx = {
  reference: string;
  status: string;
  amountKobo: number;
  currency: string;
};

export type FlagKind = "missing_in_db" | "missing_in_paystack" | "amount_mismatch" | "status_mismatch";

export type Flag = {
  kind: FlagKind;
  reference: string;
  paymentId: string | null;
  details: Record<string, unknown>;
};

const PAID = new Set(["success", "refunded"]);

/**
 * @param db payments marked paid in the window, plus any payment whose
 *   reference Paystack reported in the window
 * @param paystack the window's transactions from Paystack
 */
export function compare(db: DbPayment[], paystack: PaystackTx[]): Flag[] {
  const flags: Flag[] = [];
  const byRef = new Map(db.map((p) => [p.reference, p]));
  const seen = new Set<string>();

  for (const tx of paystack) {
    if (tx.status !== "success") continue; // abandoned or failed attempts are not money received
    seen.add(tx.reference);
    const p = byRef.get(tx.reference);
    if (!p) {
      flags.push({
        kind: "missing_in_db",
        reference: tx.reference,
        paymentId: null,
        details: { paystack_amount_kobo: tx.amountKobo, currency: tx.currency },
      });
      continue;
    }
    if (!PAID.has(p.status)) {
      // Paystack took the money but our webhook never applied it.
      flags.push({
        kind: "status_mismatch",
        reference: tx.reference,
        paymentId: p.id,
        details: { db_status: p.status, paystack_status: tx.status },
      });
    }
    if (tx.amountKobo !== p.amountKobo || tx.currency !== "NGN") {
      flags.push({
        kind: "amount_mismatch",
        reference: tx.reference,
        paymentId: p.id,
        details: { db_amount_kobo: p.amountKobo, paystack_amount_kobo: tx.amountKobo, currency: tx.currency },
      });
    }
  }

  for (const p of db) {
    if (!PAID.has(p.status) || seen.has(p.reference)) continue;
    const tx = paystack.find((t) => t.reference === p.reference);
    flags.push(
      tx
        ? {
            kind: "status_mismatch",
            reference: p.reference,
            paymentId: p.id,
            details: { db_status: p.status, paystack_status: tx.status },
          }
        : {
            kind: "missing_in_paystack",
            reference: p.reference,
            paymentId: p.id,
            details: { db_amount_kobo: p.amountKobo },
          },
    );
  }
  return flags;
}

/** The Lagos calendar day as an [inclusive, exclusive) UTC window. */
export function lagosDay(date: string): { from: string; to: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("date must be YYYY-MM-DD");
  const from = new Date(`${date}T00:00:00+01:00`);
  const to = new Date(from.getTime() + 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export const FLAG_LABEL: Record<FlagKind, string> = {
  missing_in_db: "Paid on Paystack, no matching payment here",
  missing_in_paystack: "Marked paid here, not found on Paystack",
  amount_mismatch: "Amounts differ",
  status_mismatch: "Statuses differ",
};
