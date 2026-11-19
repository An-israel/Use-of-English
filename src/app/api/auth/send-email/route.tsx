import { NextResponse, type NextRequest } from "next/server";
import { AuthMessage } from "@/emails/templates";
import { AuthHookPayload, authEmails, hookSecret } from "@/lib/email/auth-hook";
import { sendEmail } from "@/lib/email/send";
import { verifyWebhook } from "@/lib/email/webhook";
import { siteUrl } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { logger } from "@/lib/log";

/** Supabase reads this shape and shows the message where the email was triggered. */
const fail = (status: number, message: string) =>
  NextResponse.json({ error: { http_code: status, message } }, { status });

/**
 * Supabase Auth's Send Email hook (Authentication → Hooks → Send Email, HTTPS).
 * Signed with Standard Webhooks (the same HMAC scheme as Resend's webhooks),
 * verified on the raw body within a 5-minute window, then each message goes
 * out through Resend in the journal's design. Re-deliveries of the same hook
 * call send nothing twice (dedupe on the webhook id).
 */
export async function POST(req: NextRequest) {
  const raw = serverEnv.SEND_EMAIL_HOOK_SECRET;
  if (!raw) return fail(503, "The email hook is not configured on the website.");
  const body = await req.text();
  const ok = verifyWebhook(
    hookSecret(raw),
    {
      id: req.headers.get("webhook-id"),
      timestamp: req.headers.get("webhook-timestamp"),
      signature: req.headers.get("webhook-signature"),
    },
    body,
  );
  if (!ok) return fail(401, "Invalid signature.");

  let payload: AuthHookPayload;
  try {
    payload = AuthHookPayload.parse(JSON.parse(body));
  } catch {
    return fail(400, "Unexpected payload.");
  }
  const emails = authEmails(payload, siteUrl);
  if (!emails.length) {
    logger.warn({ action: payload.email_data.email_action_type }, "auth email hook: nothing to send");
    return NextResponse.json({});
  }
  const id = req.headers.get("webhook-id");
  const messages = emails.map((e) => ({
    to: e.to,
    subject: e.subject,
    template: `auth_${e.kind}`,
    dedupeKey: `auth:${id}:${e.to}`,
    element: <AuthMessage kind={e.kind} name={e.name} link={e.link} code={e.code} newEmail={e.newEmail} />,
  }));
  try {
    for (const m of messages) await sendEmail(m);
    return NextResponse.json({});
  } catch (err) {
    logger.error({ err, action: payload.email_data.email_action_type }, "auth email hook: sending failed");
    return fail(500, "The email could not be sent. Please try again in a few minutes.");
  }
}
