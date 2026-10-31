import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyWebhook } from "@/lib/email/webhook";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/log";
import { adminClient } from "@/lib/supabase/clients";

const EmailEvent = z.object({
  type: z.string().max(100),
  data: z.object({ email_id: z.string().max(200).optional(), to: z.array(z.email()).max(100).optional() }).optional(),
});

/**
 * Bounces and complaints from the email provider (item 101). Signed and
 * verified on the raw body; idempotent (re-delivery changes nothing). The
 * address is suppressed so the journal stops mailing it.
 */
export async function POST(req: NextRequest) {
  const secret = serverEnv.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const raw = await req.text();
  const ok = verifyWebhook(
    secret,
    {
      id: req.headers.get("svix-id"),
      timestamp: req.headers.get("svix-timestamp"),
      signature: req.headers.get("svix-signature"),
    },
    raw,
  );
  if (!ok) return NextResponse.json({ ok: false }, { status: 401 });

  let event: z.infer<typeof EmailEvent>;
  try {
    event = EmailEvent.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const status = event.type === "email.bounced" ? "bounced" : event.type === "email.complained" ? "complained" : null;
  if (!status) return NextResponse.json({ ok: true, ignored: event.type });

  try {
    const db = adminClient();
    if (event.data?.email_id) await db.from("email_outbox").update({ status }).eq("provider_id", event.data.email_id);
    for (const to of event.data?.to ?? []) {
      await db
        .from("email_suppressions")
        .upsert(
          { email: to, reason: status, details: { provider_event: event.type, email_id: event.data?.email_id } },
          { onConflict: "email", ignoreDuplicates: true },
        );
    }
    logger.warn({ type: event.type, recipients: event.data?.to?.length ?? 0 }, "email bounce or complaint recorded");
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "email webhook failed; the provider will retry");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
