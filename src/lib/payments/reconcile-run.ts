import "server-only";
import { randomUUID } from "node:crypto";
import { enqueue } from "@/lib/jobs/queue";
import { logger } from "@/lib/log";
import { adminClient } from "@/lib/supabase/clients";
import { paystack } from "./paystack";
import { compare, lagosDay, type DbPayment } from "./reconcile";

export type ReconcileResult =
  | { ok: true; date: string; checked: { paystack: number; database: number }; flags: number; newFlags: number }
  | { ok: false; date: string; reason: "busy" | "error"; message?: string };

/** Yesterday in Lagos, the default day to reconcile. */
export function yesterdayInLagos(now = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date(now - 86_400_000));
}

/**
 * Compare one Lagos day of Paystack transactions with the payments table and
 * record each mismatch as a reconciliation flag (idempotent: re-running a
 * day adds nothing new). A lease keeps two runs from overlapping.
 */
export async function runReconciliation(date: string): Promise<ReconcileResult> {
  const db = adminClient();
  const holder = randomUUID();
  const { data: got } = await db.rpc("acquire_lease", { p_name: "reconcile", p_holder: holder, p_ttl_seconds: 300 });
  if (!got) return { ok: false, date, reason: "busy" };
  try {
    const { from, to } = lagosDay(date);
    const txs = await paystack().listTransactions(from, to);
    const refs = txs.map((t) => t.reference);
    const [paidInWindow, referenced] = await Promise.all([
      db.from("payments").select("id, reference, status, amount_kobo").gte("paid_at", from).lt("paid_at", to),
      refs.length
        ? db.from("payments").select("id, reference, status, amount_kobo").in("reference", refs)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (paidInWindow.error || referenced.error)
      throw new Error(paidInWindow.error?.message ?? referenced.error?.message);
    const rows = new Map<string, DbPayment>();
    for (const p of [...(paidInWindow.data ?? []), ...(referenced.data ?? [])])
      rows.set(p.reference, { id: p.id, reference: p.reference, status: p.status, amountKobo: p.amount_kobo });

    const flags = compare([...rows.values()], txs);
    let newFlags = 0;
    if (flags.length) {
      const { data: inserted, error } = await db
        .from("reconciliation_flags")
        .upsert(
          flags.map((f) => ({
            run_date: date,
            payment_id: f.paymentId,
            paystack_reference: f.reference,
            kind: f.kind,
            details: f.details,
          })),
          { onConflict: "run_date,paystack_reference,kind", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw new Error(error.message);
      newFlags = inserted?.length ?? 0;
      if (newFlags)
        await enqueue("email_reconciliation", { date, flags: newFlags }, `reconcile-email:${date}:${newFlags}`);
    }
    await db.rpc("release_lease", { p_name: "reconcile", p_holder: holder, p_status: "ok" });
    return { ok: true, date, checked: { paystack: txs.length, database: rows.size }, flags: flags.length, newFlags };
  } catch (err) {
    logger.error({ err, date }, "reconciliation failed");
    await db.rpc("release_lease", {
      p_name: "reconcile",
      p_holder: holder,
      p_status: "error",
      p_error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, date, reason: "error", message: err instanceof Error ? err.message : undefined };
  }
}
