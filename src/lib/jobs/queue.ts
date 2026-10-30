import "server-only";
import { adminClient } from "@/lib/supabase/clients";

/** Add a job; the dedupe key makes producers idempotent (item 14). */
export async function enqueue(kind: string, payload: Record<string, unknown>, dedupeKey?: string, queue = "default") {
  const { error } = await adminClient()
    .from("jobs")
    .upsert(
      { kind, payload, queue, dedupe_key: dedupeKey ?? null },
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    );
  if (error) throw new Error(`enqueue ${kind} failed: ${error.message}`);
}
