import "server-only";
import { adminClient } from "@/lib/supabase/clients";

/**
 * Add a job; the dedupe key makes producers idempotent (item 14). Higher
 * priority is claimed first (B4): payment work uses PRIORITY.payment.
 */
export const PRIORITY = { normal: 0, payment: 10 } as const;

export async function enqueue(
  kind: string,
  payload: Record<string, unknown>,
  dedupeKey?: string,
  queue = "default",
  priority: number = PRIORITY.normal,
) {
  const { error } = await adminClient()
    .from("jobs")
    .upsert(
      { kind, payload, queue, dedupe_key: dedupeKey ?? null, priority },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`enqueue ${kind} failed: ${error.message}`);
}
