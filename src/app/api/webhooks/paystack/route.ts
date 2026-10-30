import { after, NextResponse, type NextRequest } from "next/server";
import { logger, requestLogger } from "@/lib/log";
import { runJobs } from "@/lib/jobs/worker";
import { paystack, verifySignature, webhookSecret } from "@/lib/payments/paystack";
import { withDbRetry } from "@/lib/resilience";
import { adminClient } from "@/lib/supabase/clients";

/**
 * Paystack webhook: the single source of truth for payments (section 7.1).
 * 1. Verify x-paystack-signature (HMAC SHA-512 of the raw body).
 * 2. For charge.success, re-verify with the Verify Transaction API.
 * 3. Apply in one database transaction that checks amount, currency and
 *    reference and ignores repeats (idempotent).
 * A 5xx response makes Paystack retry later.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = webhookSecret();
  const log = requestLogger(req.headers.get("x-request-id") ?? crypto.randomUUID(), { route: "paystack-webhook" });
  if (!secret || !verifySignature(raw, req.headers.get("x-paystack-signature"), secret)) {
    log.warn("rejected webhook with a bad signature");
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const reference = event.data.reference;
  try {
    const v = await paystack().verify(reference);
    if (v.status !== "success") {
      log.warn({ reference, status: v.status }, "webhook said success but verification did not");
      return NextResponse.json({ ok: true, verified: v.status });
    }
    const { data: outcome, error } = await withDbRetry(() =>
      adminClient().rpc("apply_payment_success", {
        p_reference: v.reference,
        p_amount_kobo: v.amountKobo,
        p_currency: v.currency,
        p_paystack_id: v.paystackId,
        p_channel: v.channel,
        p_paid_at: v.paidAt,
        p_raw: v.raw as object,
      }),
    );
    if (error) throw new Error(error.message);
    log.info({ reference, outcome }, "payment webhook processed");
    // Receipt and emails go through the queue; run it now rather than waiting for cron.
    after(() => runJobs({ maxBatches: 3 }).catch((err) => logger.error({ err }, "post-webhook job run failed")));
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    log.error({ err, reference }, "payment webhook failed; Paystack will retry");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
