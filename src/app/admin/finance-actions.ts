"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbMessage, staff, type ActionResult } from "@/lib/admin/server";
import { kickJobs } from "@/lib/jobs/kick";
import { runReconciliation } from "@/lib/payments/reconcile-run";

/**
 * Finance Officer and Super Admin actions. Refunds are recorded, not sent:
 * the money is returned in the Paystack dashboard and its reference noted
 * here (brief section 7.2). RLS checks the role again in the database.
 */
const FINANCE = ["super_admin", "finance_officer"] as const;
const notFinance: ActionResult = { ok: false, message: "Only the Finance Officer or a Super Admin can do that." };

export async function recordRefund(form: FormData): Promise<ActionResult> {
  const s = await staff([...FINANCE]);
  if (!s) return notFinance;
  const parsed = z
    .object({
      payment_id: z.uuid(),
      amount: z.coerce.number().positive("Enter the amount refunded.").max(10_000_000),
      reason: z.string().trim().min(5, "Give the reason for the refund.").max(1000),
      refunded_on: z.iso.date("Enter the date of the refund."),
      reference: z.string().trim().max(120),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  if (Date.parse(d.refunded_on) > Date.now() + 86_400_000)
    return { ok: false, message: "The refund date can’t be in the future." };
  const { error } = await s.db.from("refunds").insert({
    payment_id: d.payment_id,
    amount_kobo: Math.round(d.amount * 100),
    reason: d.reason,
    refunded_on: d.refunded_on,
    paystack_refund_reference: d.reference || null,
    recorded_by: s.viewer.id,
  });
  if (error) return { ok: false, message: dbMessage(error, "The refund couldn’t be recorded.") };
  kickJobs();
  revalidatePath(`/admin/payments/${d.payment_id}`);
  return { ok: true, message: "Refund recorded." };
}

export async function resolveFlag(form: FormData): Promise<ActionResult> {
  const s = await staff([...FINANCE]);
  if (!s) return notFinance;
  const id = String(form.get("id") ?? "");
  const note = String(form.get("note") ?? "").trim();
  if (note.length < 5) return { ok: false, message: "Say how this was resolved (a few words)." };
  const { data, error } = await s.db
    .from("reconciliation_flags")
    .update({ resolved_at: new Date().toISOString(), resolved_by: s.viewer.id, resolution_note: note.slice(0, 1000) })
    .eq("id", id)
    .is("resolved_at", null)
    .select("id");
  if (error) return { ok: false, message: dbMessage(error) };
  if (!data?.length) return { ok: false, message: "This flag was already resolved." };
  revalidatePath("/admin/reconciliation");
  return { ok: true, message: "Marked as resolved." };
}

export async function reconcileNow(form: FormData): Promise<ActionResult> {
  const s = await staff([...FINANCE]);
  if (!s) return notFinance;
  const date = String(form.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Choose a date." };
  const r = await runReconciliation(date);
  if (!r.ok)
    return {
      ok: false,
      message:
        r.reason === "busy"
          ? "A reconciliation is already running. Try again in a minute."
          : "Paystack couldn’t be reached. Try again later.",
    };
  kickJobs();
  revalidatePath("/admin/reconciliation");
  return {
    ok: true,
    message: r.flags
      ? `${r.date}: ${r.flags} mismatch${r.flags === 1 ? "" : "es"} (${r.newFlags} new).`
      : `${r.date}: everything matches (${r.checked.paystack} Paystack transactions checked).`,
  };
}
