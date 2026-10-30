import "server-only";
import { createHash } from "node:crypto";
import { isDemoMode } from "@/lib/env";
import { adminClient } from "@/lib/supabase/clients";
import { logger } from "@/lib/log";

/**
 * Postgres-backed fixed-window rate limiter (item 1), shared by every server
 * instance. Clients are keyed by a hash of their IP; the raw IP is not stored.
 */

export type RateLimitRule = { name: string; max: number; windowSeconds: number };

export const RATE_LIMITS = {
  login: { name: "login", max: 10, windowSeconds: 300 },
  signup: { name: "signup", max: 5, windowSeconds: 3600 },
  passwordReset: { name: "password-reset", max: 5, windowSeconds: 3600 },
  contact: { name: "contact", max: 5, windowSeconds: 3600 },
  submission: { name: "submission", max: 20, windowSeconds: 3600 },
  payment: { name: "payment", max: 10, windowSeconds: 600 },
  download: { name: "download", max: 120, windowSeconds: 600 },
  publicApi: { name: "public-api", max: 300, windowSeconds: 300 },
} satisfies Record<string, RateLimitRule>;

export function clientKey(req: { headers: Headers }): string {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256")
    .update(`${process.env.METRICS_SALT ?? "jhts"}:${ip}`)
    .digest("hex")
    .slice(0, 32);
}

export async function rateLimit(
  req: { headers: Headers },
  rule: RateLimitRule,
  subject?: string,
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  if (isDemoMode) return { allowed: true, remaining: rule.max, retryAfter: 0 };
  const key = `${rule.name}:${subject ?? clientKey(req)}`;
  const { data, error } = await adminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_window_seconds: rule.windowSeconds,
    p_max: rule.max,
  });
  if (error || !data?.[0]) {
    // Fail open: a database hiccup must not lock everyone out of sign-in.
    logger.warn({ err: error, rule: rule.name }, "rate limiter unavailable");
    return { allowed: true, remaining: rule.max, retryAfter: 0 };
  }
  const row = data[0] as { allowed: boolean; remaining: number; retry_after: number };
  return { allowed: row.allowed, remaining: row.remaining, retryAfter: row.retry_after };
}
