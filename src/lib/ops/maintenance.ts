import "server-only";
import { connect } from "node:tls";
import { createElement } from "react";
import { OpsAlert } from "@/emails/templates";
import { sendEmail } from "@/lib/email/send";
import { serverEnv } from "@/lib/env.server";
import { siteUrl } from "@/lib/env";
import { enqueue } from "@/lib/jobs/queue";
import { logger } from "@/lib/log";
import { adminClient } from "@/lib/supabase/clients";

/**
 * Daily maintenance (item 21): reviewer reminders, clean-up of orphaned
 * uploads and abandoned drafts, and alerts (item 62). Each step is
 * idempotent and independent; one failing never stops the others.
 */

const DAY = 86_400_000;
export const REMIND_BEFORE_DAYS = 3;
export const REMIND_EVERY_DAYS = 3;
export const ORPHAN_AFTER_HOURS = 24;
export const DRAFT_EXPIRES_DAYS = 180;
export const BACKUP_STALE_DAYS = 8;

const today = () => new Date().toISOString().slice(0, 10);

/** Reviews due within three days, or overdue, get a reminder at most every three days. */
export async function reviewerReminders(now = Date.now()): Promise<number> {
  const db = adminClient();
  const { data, error } = await db
    .from("review_assignments")
    .select("id, last_reminded_at")
    .in("status", ["invited", "accepted"])
    .lte("due_at", new Date(now + REMIND_BEFORE_DAYS * DAY).toISOString());
  if (error) throw new Error(error.message);
  const due = (data ?? []).filter(
    (r) => !r.last_reminded_at || Date.parse(r.last_reminded_at) < now - REMIND_EVERY_DAYS * DAY,
  );
  for (const r of due) {
    await enqueue("email_review_reminder", { assignment_id: r.id }, `remind:${r.id}:${today()}`);
    await db
      .from("review_assignments")
      .update({ last_reminded_at: new Date(now).toISOString() })
      .eq("id", r.id);
  }
  return due.length;
}

/**
 * Uploads that were never linked to a row (the browser uploaded, then the
 * save failed or the tab closed) are the saga's leftovers (item 19): delete
 * the file, then its record.
 */
export async function cleanOrphanedUploads(now = Date.now()): Promise<number> {
  const db = adminClient();
  const { data, error } = await db
    .from("pending_uploads")
    .select("storage_path, bucket")
    .lt("created_at", new Date(now - ORPHAN_AFTER_HOURS * 3_600_000).toISOString())
    .limit(500);
  if (error) throw new Error(error.message);
  const byBucket = new Map<string, string[]>();
  for (const u of data ?? []) byBucket.set(u.bucket, [...(byBucket.get(u.bucket) ?? []), u.storage_path]);
  for (const [bucket, paths] of byBucket) {
    const { error: rmError } = await db.storage.from(bucket).remove(paths);
    if (rmError) throw new Error(rmError.message);
    await db.from("pending_uploads").delete().in("storage_path", paths);
  }
  return data?.length ?? 0;
}

/** Drafts untouched for six months are removed with their files (authors are told in the submission guide). */
export async function expireDrafts(now = Date.now()): Promise<number> {
  const db = adminClient();
  const { data, error } = await db
    .from("submissions")
    .select("id, files:submission_files ( storage_path )")
    .eq("status", "draft")
    .lt("updated_at", new Date(now - DRAFT_EXPIRES_DAYS * DAY).toISOString())
    .limit(200);
  if (error) throw new Error(error.message);
  for (const s of data ?? []) {
    const paths = (s.files as { storage_path: string }[]).map((f) => f.storage_path);
    if (paths.length) await db.storage.from("submissions").remove(paths);
    await db.from("submissions").delete().eq("id", s.id).eq("status", "draft");
  }
  return data?.length ?? 0;
}

/** Who receives alerts (item 110): ALERT_EMAIL if set, otherwise every active Super Admin. */
async function alertRecipients(): Promise<string[]> {
  if (serverEnv.ALERT_EMAIL) return [serverEnv.ALERT_EMAIL];
  const { data } = await adminClient().from("profiles").select("email").eq("role", "super_admin").eq("is_active", true);
  return (data ?? []).map((p) => p.email);
}

async function alert(key: string, subject: string, lines: string[]) {
  for (const to of await alertRecipients()) {
    // Sent directly, not through the queue: an alert about the queue must not depend on it.
    await sendEmail({
      to,
      subject: `[JHTS alert] ${subject}`,
      template: "ops_alert",
      dedupeKey: `alert:${key}:${today()}:${to}`,
      element: createElement(OpsAlert, { subject, lines, url: `${siteUrl}/admin/system` }),
    });
  }
}

export const CERT_WARN_DAYS = 14;

/** Days until the site's TLS certificate expires (null for local or plain-HTTP sites). */
export function certDaysLeft(url: string, now = Date.now()): Promise<number | null> {
  const u = new URL(url);
  if (u.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(u.hostname)) return Promise.resolve(null);
  return new Promise((resolve) => {
    const socket = connect({ host: u.hostname, port: 443, servername: u.hostname, timeout: 5_000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(cert?.valid_to ? Math.floor((Date.parse(cert.valid_to) - now) / DAY) : null);
    });
    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });
  });
}

/** Alerts that the app itself can see: failed jobs, backups that failed or stopped, a certificate near expiry. */
export async function checkAlerts(now = Date.now()): Promise<string[]> {
  const db = adminClient();
  const raised: string[] = [];
  const { count: dead } = await db.from("dead_letter_jobs").select("id", { count: "exact", head: true });
  if (dead) {
    raised.push("dead-letters");
    await alert("dead-letters", `${dead} failed background job${dead === 1 ? "" : "s"}`, [
      `${dead} job${dead === 1 ? " has" : "s have"} failed after every retry (for example an email that could not be sent).`,
      "Open the System screen to see the error, then retry or discard each one.",
    ]);
  }
  const { data: last } = await db
    .from("backup_runs")
    .select("status, started_at, details")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last?.status === "failed") {
    raised.push("backup-failed");
    await alert("backup-failed", "The weekly backup failed", [
      `The backup started ${new Date(last.started_at).toUTCString()} reported a failure.`,
      "Check the backup workflow's log in GitHub Actions and run it again.",
    ]);
  } else if (!last || Date.parse(last.started_at) < now - BACKUP_STALE_DAYS * DAY) {
    raised.push("backup-stale");
    await alert("backup-stale", "No recent backup", [
      last
        ? `The last off-site backup was on ${new Date(last.started_at).toUTCString()}, more than ${BACKUP_STALE_DAYS} days ago.`
        : "No off-site backup has been recorded yet.",
      "Check that the weekly backup workflow is enabled in GitHub Actions (see docs/RUNBOOK.md).",
    ]);
  }
  const days = await certDaysLeft(siteUrl, now);
  if (days !== null && days < CERT_WARN_DAYS) {
    raised.push("certificate");
    await alert("certificate", `The site's certificate expires in ${days} day${days === 1 ? "" : "s"}`, [
      `The HTTPS certificate for ${new URL(siteUrl).hostname} expires in ${days} days. Vercel renews it automatically while the DNS points at Vercel.`,
      "Check the domain in Vercel → Settings → Domains, and the DNS records in docs/RUNBOOK.md.",
    ]);
  }
  return raised;
}

/**
 * Housekeeping retention (B7): finished jobs after 30 days, rate-limit counters
 * after a day, events and sent emails after a year, staff notifications after
 * six months. Financial and editorial records are never pruned.
 */
export async function pruneHousekeeping(): Promise<Record<string, number>> {
  const { data, error } = await adminClient().rpc("prune_housekeeping");
  if (error) throw new Error(error.message);
  return data as Record<string, number>;
}

export async function runDaily() {
  const steps = {
    reminders: reviewerReminders,
    orphans: cleanOrphanedUploads,
    drafts: expireDrafts,
    retention: pruneHousekeeping,
    alerts: checkAlerts,
  };
  const result: Record<string, unknown> = {};
  for (const [name, fn] of Object.entries(steps)) {
    try {
      result[name] = await fn();
    } catch (err) {
      logger.error({ err, step: name }, "daily maintenance step failed");
      result[name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return result;
}
