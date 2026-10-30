import "server-only";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import { logger } from "@/lib/log";
import { withDbRetry } from "@/lib/resilience";
import { adminClient } from "@/lib/supabase/clients";
import { HANDLERS, type Job } from "./handlers";

/**
 * Processes queued jobs in bounded batches (item 44). Jobs are claimed with
 * FOR UPDATE SKIP LOCKED, so several workers can run at once safely; failures
 * retry with backoff and land in the dead-letter table after max attempts.
 */
const tracer = trace.getTracer("jhts-jobs");

export async function runJobs({
  maxBatches = 5,
  batchSize = 10,
  worker = `w-${crypto.randomUUID().slice(0, 8)}`,
} = {}) {
  const db = adminClient();
  const summary = { done: 0, retried: 0, dead: 0 };
  for (let b = 0; b < maxBatches; b++) {
    const { data: jobs, error } = await withDbRetry(() =>
      db.rpc("claim_jobs", { p_worker: worker, p_limit: batchSize }),
    );
    if (error) throw new Error(`claim_jobs failed: ${error.message}`);
    if (!jobs?.length) break;
    for (const job of jobs as Job[]) {
      // One trace span per job (item 60), so a slow email or receipt shows up beside the request that queued it.
      await tracer.startActiveSpan(
        `job ${job.kind}`,
        { attributes: { "jhts.job.id": job.id, "jhts.job.attempts": job.attempts } },
        async (span) => {
          const handler = HANDLERS[job.kind];
          try {
            if (!handler) throw new Error(`no handler for ${job.kind}`);
            await handler(job.payload);
            await db.rpc("complete_job", { p_id: job.id });
            summary.done++;
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            span.setStatus({ code: SpanStatusCode.ERROR, message });
            const { data: outcome } = await db.rpc("fail_job", { p_id: job.id, p_error: message });
            if (outcome === "dead") summary.dead++;
            else summary.retried++;
            logger.warn({ jobId: job.id, kind: job.kind, attempts: job.attempts, outcome, err: message }, "job failed");
          } finally {
            span.end();
          }
        },
      );
    }
  }
  return summary;
}
