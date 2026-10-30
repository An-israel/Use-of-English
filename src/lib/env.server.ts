import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(16).optional(),
  METRICS_SALT: z.string().min(16).optional(),
  SENTRY_DSN: z.url().optional().or(z.literal("")),
  ALERT_EMAIL: z.email().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  BACKUP_TARGET: z.string().optional(),
});

export const serverEnv = serverSchema.parse(
  Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v])),
);

/** Paystack test keys start with sk_test_; the admin shows a TEST MODE banner. */
export const paystackTestMode = !serverEnv.PAYSTACK_SECRET_KEY || serverEnv.PAYSTACK_SECRET_KEY.startsWith("sk_test_");
