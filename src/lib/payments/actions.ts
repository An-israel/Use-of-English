"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RATE_LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { getViewer } from "@/lib/auth";
import { getFlags, getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/log";
import { paystack } from "@/lib/payments/paystack";
import { adminClient, userClient } from "@/lib/supabase/clients";
import { z } from "zod";
import { fields, Id, INVALID, validArgs } from "@/lib/validation";

export type PayState = { status: "idle" | "error"; message?: string };

/**
 * Starts a Paystack payment for a fee that is due. The amount comes from
 * settings and is stored on the payment row; card details never touch JHTS.
 */
export async function startPayment(_: PayState, form: FormData): Promise<PayState> {
  if (!validArgs(z.object({ submissionId: Id, fee: z.enum(["review", "publication"]) }), fields(form)))
    return { status: "error", message: INVALID.message };
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Please sign in again." };
  const submissionId = String(form.get("submissionId") ?? "");
  const fee = form.get("fee") === "publication" ? "publication" : "review";

  const limit = await rateLimit({ headers: await headers() }, RATE_LIMITS.payment, `payment:${viewer.id}`);
  if (!limit.allowed) return { status: "error", message: "Too many payment attempts. Please wait a few minutes." };

  // Ownership is checked through RLS: authors can only read their own submissions.
  const { data: own } = await (
    await userClient()
  )
    .from("submissions")
    .select("id, author_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!own || own.author_id !== viewer.id) return { status: "error", message: "Submission not found." };

  const [settings, flags] = await Promise.all([getSettings(), getFlags()]);
  if (!settings.fees.enabled || !flags.fees_enabled)
    return { status: "error", message: "Fees are not being charged at present." };
  const amount = fee === "review" ? settings.fees.reviewKobo : settings.fees.publicationKobo;

  const { data: payment, error } = await adminClient().rpc("start_payment", {
    p_submission: submissionId,
    p_fee: fee,
    p_amount_kobo: amount,
  });
  if (error || !payment) {
    return {
      status: "error",
      message:
        error?.message.includes("not due") || error?.message.includes("settled")
          ? "This fee is not due."
          : "We couldn’t start the payment. Please try again.",
    };
  }

  let url: string;
  try {
    const init = await paystack().initialize({
      email: viewer.email,
      amountKobo: amount,
      reference: payment.reference,
      callbackUrl: `${siteUrl}/payments/callback`,
      metadata: {
        submission_id: submissionId,
        fee_type: fee,
        author_id: viewer.id,
        custom_fields: [{ display_name: "Fee", variable_name: "fee", value: fee }],
      },
    });
    url = init.authorizationUrl;
  } catch (err) {
    logger.error({ err, reference: payment.reference }, "paystack initialize failed");
    await adminClient().from("payments").update({ status: "failed" }).eq("id", payment.id);
    return { status: "error", message: "The payment service is not responding. Please try again in a few minutes." };
  }
  redirect(url);
}
