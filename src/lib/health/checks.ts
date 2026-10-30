import "server-only";
import { isDemoMode } from "@/lib/env";
import { adminClient } from "@/lib/supabase/clients";
import { withTimeout } from "@/lib/resilience";

export type CheckResult = { ok: boolean; ms: number; detail?: unknown; error?: string };

async function timed(fn: () => Promise<unknown>): Promise<CheckResult> {
  const started = performance.now();
  try {
    const detail = await withTimeout(() => fn() as Promise<unknown>, 3_000);
    return { ok: true, ms: Math.round(performance.now() - started), detail };
  } catch (err) {
    return {
      ok: false,
      ms: Math.round(performance.now() - started),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Database and storage connectivity (items 56–57). */
export async function dependencyChecks() {
  if (isDemoMode) {
    const demo: CheckResult = { ok: true, ms: 0, detail: "demo mode: Supabase not configured" };
    return { database: demo, storage: demo };
  }
  const [database, storage] = await Promise.all([
    timed(async () => {
      const { data, error } = await adminClient().rpc("health_check");
      if (error) throw new Error(error.message);
      return data;
    }),
    timed(async () => {
      const { error } = await adminClient().storage.getBucket("published");
      if (error) throw new Error(error.message);
      return "reachable";
    }),
  ]);
  return { database, storage };
}
