import "server-only";
import { serverEnv } from "@/lib/env.server";
import { isDemoMode } from "@/lib/env";
import { logger } from "@/lib/log";
import { adminClient } from "@/lib/supabase/clients";
import { isBot, sessionHash } from "./downloads";

type Metric = {
  kind: "view" | "download";
  articleId?: string | null;
  issueId?: string | null;
  format?: "pdf" | "docx" | "html" | "";
};

/**
 * Record one view or download (brief section 10): bots are skipped, the
 * reader is a salted daily hash, and the database keeps one count per
 * reader per article per day. Never throws: counting must not break reading.
 */
export async function recordMetric(headers: Headers, m: Metric): Promise<boolean> {
  if (isDemoMode) return false;
  const ua = headers.get("user-agent");
  if (isBot(ua)) return false;
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  try {
    const { data, error } = await adminClient().rpc("record_metric", {
      p_kind: m.kind,
      p_article: m.articleId ?? null,
      p_issue: m.issueId ?? null,
      p_format: m.format ?? "",
      p_session_hash: sessionHash(ip, ua!, day, serverEnv.METRICS_SALT ?? "jhts-metrics"),
      p_country: headers.get("x-vercel-ip-country"),
    });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    logger.warn({ err, kind: m.kind }, "metric not recorded");
    return false;
  }
}
