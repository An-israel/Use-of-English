import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { issueLabel } from "@/lib/issues";
import { LEDGER_COLUMNS, dateBounds, type FinanceFilters, type LedgerRow } from "./finance";

/** Upper bound for totals and exports; a quarterly journal stays far below it. */
export const LEDGER_MAX = 10_000;

/** The payments ledger (staff-only view) with the finance filters applied. */
export function ledgerQuery(db: SupabaseClient, f: FinanceFilters, opts: { count?: boolean } = {}) {
  let q = db
    .from("payment_ledger")
    .select(LEDGER_COLUMNS, opts.count ? { count: "exact" } : undefined)
    .order("activity_at", { ascending: false });
  const { gte, lt } = dateBounds(f);
  if (gte) q = q.gte("activity_at", gte);
  if (lt) q = q.lt("activity_at", lt);
  if (f.fee) q = q.eq("fee_type", f.fee);
  if (f.status) q = q.eq("status", f.status);
  if (f.issue) q = q.eq("issue_id", f.issue);
  return q;
}

export async function allLedgerRows(db: SupabaseClient, f: FinanceFilters): Promise<LedgerRow[]> {
  const { data, error } = await ledgerQuery(db, f).limit(LEDGER_MAX).returns<LedgerRow[]>();
  if (error) throw new Error(`ledger query failed: ${error.message}`);
  return data ?? [];
}

export async function issueOptions(db: SupabaseClient) {
  const { data } = await db
    .from("issues")
    .select("id, number, month, volume:volumes ( number, year )")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []).map((i) => {
    const v = i.volume as unknown as { number: number; year: number };
    return { value: i.id, label: issueLabel({ volume: v.number, number: i.number, month: i.month, year: v.year }) };
  });
}
