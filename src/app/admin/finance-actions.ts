"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dbMessage, staff, type ActionResult } from "@/lib/admin/server";
import { kickJobs } from "@/lib/jobs/kick";
import { fields, Id, INVALID, validArgs } from "@/lib/validation";

/**
 * Finance Officer and Super Admin actions: confirming bank transfers against
 * the bank statement, and recording refunds (the money is transferred back
 * from the journal's account first). RLS checks the role again in the database.
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

/** The money is in the journal's account: record the transfer as paid. */
export async function confirmTransfer(paymentId: string): Promise<ActionResult> {
  if (!validArgs(Id, paymentId)) return INVALID;
  const s = await staff([...FINANCE]);
  if (!s) return notFinance;
  const { data: outcome, error } = await s.db.rpc("confirm_bank_transfer", { p_payment: paymentId });
  if (error) return { ok: false, message: dbMessage(error, "The payment couldn’t be confirmed.") };
  kickJobs();
  revalidatePath(`/admin/payments/${paymentId}`);
  revalidatePath("/admin/payments");
  return {
    ok: true,
    message:
      outcome === "duplicate"
        ? "This payment was already confirmed."
        : "Payment confirmed. The author’s receipt is on its way and the submission has moved on.",
  };
}

/** The transfer can't be matched: the author is told why and can upload again. */
export async function rejectTransfer(form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      payment_id: z.uuid(),
      reason: z.string().trim().min(5, "Say why, so the author can put it right.").max(1000),
    })
    .safeParse(fields(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const s = await staff([...FINANCE]);
  if (!s) return notFinance;
  const { error } = await s.db.rpc("reject_bank_transfer", {
    p_payment: parsed.data.payment_id,
    p_reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: dbMessage(error, "The payment couldn’t be updated.") };
  kickJobs();
  revalidatePath(`/admin/payments/${parsed.data.payment_id}`);
  revalidatePath("/admin/payments");
  return { ok: true, message: "The author has been told and can upload a new receipt." };
}
