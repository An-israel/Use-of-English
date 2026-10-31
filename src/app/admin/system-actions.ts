"use server";

import { revalidatePath } from "next/cache";
import { dbMessage, staff, type ActionResult } from "@/lib/admin/server";
import { runJobs } from "@/lib/jobs/worker";
import { runDaily } from "@/lib/ops/maintenance";
import { STAFF_ROLES } from "@/lib/workflow";
import { z } from "zod";
import { INVALID, validArgs } from "@/lib/validation";

const SA = ["super_admin"] as const;
const notSa: ActionResult = { ok: false, message: "Only a Super Admin can do that." };

export async function retryDeadLetter(id: number): Promise<ActionResult> {
  if (!validArgs(z.number().int().positive(), id)) return INVALID;
  const s = await staff([...SA]);
  if (!s) return notSa;
  const { error } = await s.db.rpc("retry_dead_letter", { p_id: id });
  if (error) return { ok: false, message: dbMessage(error) };
  const r = await runJobs({ maxBatches: 1 });
  revalidatePath("/admin/system");
  return {
    ok: true,
    message: r.done ? "Job retried and completed." : "Job queued again; it will run with the next batch.",
  };
}

export async function discardDeadLetter(id: number): Promise<ActionResult> {
  if (!validArgs(z.number().int().positive(), id)) return INVALID;
  const s = await staff([...SA]);
  if (!s) return notSa;
  const { error } = await s.db.from("dead_letter_jobs").delete().eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };
  revalidatePath("/admin/system");
  return { ok: true, message: "Failed job discarded." };
}

export async function processQueueNow(): Promise<ActionResult> {
  const s = await staff([...SA]);
  if (!s) return notSa;
  const r = await runJobs();
  revalidatePath("/admin/system");
  return { ok: true, message: `Queue processed: ${r.done} done, ${r.retried} to retry, ${r.dead} failed.` };
}

export async function runMaintenanceNow(): Promise<ActionResult> {
  const s = await staff([...SA]);
  if (!s) return notSa;
  const r = await runDaily();
  revalidatePath("/admin/system");
  return { ok: true, message: `Maintenance run: ${JSON.stringify(r)}` };
}

// ---------------------------------------------------------------------------
// Staff notifications (item 16)
// ---------------------------------------------------------------------------

export type StaffNotification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string;
  created_at: string;
};

export async function getNotifications(): Promise<{ items: StaffNotification[]; unread: number } | null> {
  const s = await staff(STAFF_ROLES);
  if (!s) return null;
  const [{ data: items }, { data: me }] = await Promise.all([
    s.db
      .from("staff_notifications")
      .select("id, kind, title, body, href, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
    s.db.from("profiles").select("notifications_seen_at").eq("id", s.viewer.id).single(),
  ]);
  const seen = me?.notifications_seen_at ? Date.parse(me.notifications_seen_at) : 0;
  return { items: items ?? [], unread: (items ?? []).filter((n) => Date.parse(n.created_at) > seen).length };
}

export async function markNotificationsSeen(): Promise<void> {
  const s = await staff(STAFF_ROLES);
  if (!s) return;
  await s.db.rpc("mark_notifications_seen");
}
