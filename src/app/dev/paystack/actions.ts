"use server";

import { notFound, redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { sign, webhookSecret } from "@/lib/payments/paystack";
import { adminClient } from "@/lib/supabase/clients";

/** Records the simulated outcome, then sends a signed charge.success webhook like Paystack. */
export async function mockOutcome(form: FormData) {
  if (process.env.PAYSTACK_MODE !== "mock" || process.env.VERCEL_ENV === "production") notFound();
  const reference = String(form.get("reference") ?? "");
  const outcome = form.get("outcome") === "success" ? "success" : "failed";
  const db = adminClient();
  const { data: p } = await db.from("payments").select("id, amount_kobo, raw").eq("reference", reference).maybeSingle();
  if (!p) notFound();
  await db
    .from("payments")
    .update({ raw: { ...(p.raw as object), mock_outcome: outcome } })
    .eq("id", p.id);
  if (outcome === "success") {
    const body = JSON.stringify({
      event: "charge.success",
      data: { reference, amount: p.amount_kobo, currency: "NGN" },
    });
    await fetch(`${siteUrl}/api/webhooks/paystack`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-paystack-signature": sign(body, webhookSecret()!) },
      body,
    });
  } else {
    await db.from("payments").update({ status: "failed" }).eq("id", p.id);
  }
  const callback = new URL(String(form.get("callback") ?? "/payments/callback"), siteUrl);
  callback.searchParams.set("reference", reference);
  redirect(callback.toString());
}
