import "server-only";
import { after } from "next/server";
import { logger } from "@/lib/log";
import { isDemoMode } from "@/lib/env";
import { runJobs } from "./worker";

/** Process queued jobs right after the response is sent, instead of waiting for the schedule. */
export function kickJobs() {
  if (isDemoMode) return;
  after(() => runJobs({ maxBatches: 2 }).catch((err) => logger.error({ err }, "job kick failed")));
}
