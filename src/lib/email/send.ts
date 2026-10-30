import "server-only";
import type { ReactElement } from "react";
import { render, toPlainText } from "@react-email/render";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/log";
import { circuitBreaker, withTimeout } from "@/lib/resilience";
import { adminClient } from "@/lib/supabase/clients";

const breaker = circuitBreaker("email", { threshold: 4, coolDownMs: 120_000 });

export type SendInput = {
  to: string;
  subject: string;
  template: string;
  element: ReactElement;
  relatedId?: string;
  /** A stable key so retries never send the same email twice */
  dedupeKey?: string;
  replyTo?: string;
};

/**
 * Sends through Resend and records every message in email_outbox. Without
 * RESEND_API_KEY (development, tests) the message is logged instead of sent.
 * Throws on provider failure so the job queue retries with backoff.
 */
export async function sendEmail(input: SendInput): Promise<"sent" | "logged" | "duplicate" | "suppressed"> {
  const db = adminClient();
  if (input.dedupeKey) {
    const { data: existing } = await db
      .from("email_outbox")
      .select("status")
      .eq("dedupe_key", input.dedupeKey)
      .maybeSingle();
    if (existing && existing.status !== "failed" && existing.status !== "queued") return "duplicate";
  }

  // Addresses that bounced or complained are not mailed again (item 101).
  const { data: suppressed } = await db.from("email_suppressions").select("reason").eq("email", input.to).maybeSingle();
  if (suppressed) {
    await db.from("email_outbox").upsert(
      {
        to_email: input.to,
        subject: input.subject,
        template: input.template,
        related_id: input.relatedId ?? null,
        dedupe_key: input.dedupeKey ?? null,
        status: "suppressed",
        error: `address suppressed (${suppressed.reason})`,
      },
      { onConflict: "dedupe_key" },
    );
    logger.warn({ template: input.template, reason: suppressed.reason }, "email not sent: address suppressed");
    return "suppressed";
  }

  const html = await render(input.element);
  const text = toPlainText(html);
  const { data: row } = await db
    .from("email_outbox")
    .upsert(
      {
        to_email: input.to,
        subject: input.subject,
        template: input.template,
        related_id: input.relatedId ?? null,
        dedupe_key: input.dedupeKey ?? null,
        status: "queued",
      },
      { onConflict: "dedupe_key" },
    )
    .select("id")
    .single();

  const key = serverEnv.RESEND_API_KEY;
  if (!key) {
    logger.info({ to: input.to, subject: input.subject, template: input.template }, "email logged (no RESEND_API_KEY)");
    if (row)
      await db.from("email_outbox").update({ status: "logged", sent_at: new Date().toISOString() }).eq("id", row.id);
    return "logged";
  }

  try {
    const resend = new Resend(key);
    const res = await breaker.call(() =>
      withTimeout(
        () =>
          resend.emails.send({
            from: process.env.EMAIL_FROM ?? "JHTS <editorial@jhts.unn.edu.ng>",
            to: input.to,
            subject: input.subject,
            html,
            text,
            replyTo: input.replyTo,
          }),
        10_000,
      ),
    );
    if (res.error) throw new Error(res.error.message);
    if (row)
      await db
        .from("email_outbox")
        .update({ status: "sent", provider_id: res.data?.id ?? null, sent_at: new Date().toISOString() })
        .eq("id", row.id);
    return "sent";
  } catch (err) {
    if (row)
      await db
        .from("email_outbox")
        .update({ status: "failed", error: err instanceof Error ? err.message : String(err) })
        .eq("id", row.id);
    throw err;
  }
}
