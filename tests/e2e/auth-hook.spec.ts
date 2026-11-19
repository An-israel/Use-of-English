import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { signWebhook } from "../../src/lib/email/webhook";

/**
 * Supabase Auth's Send Email hook: Supabase posts each sign-up, password
 * reset or invitation to /api/auth/send-email, signed like Standard Webhooks,
 * and the site sends it through Resend (logged locally without a key).
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SECRET = process.env.SEND_EMAIL_HOOK_SECRET;
test.skip(!URL_ || !KEY || !SECRET, "requires Supabase and SEND_EMAIL_HOOK_SECRET");
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

const run = Date.now().toString(36);
const post = (request: import("@playwright/test").APIRequestContext, body: string, sign = true) => {
  const id = `msg_${run}_${Math.random().toString(36).slice(2)}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const key = SECRET!.replace(/^v1,/, "");
  return request.post("/api/auth/send-email", {
    data: body,
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": sign ? `v1,${signWebhook(key, id, ts, body)}` : "v1,bm9wZQ==",
    },
  });
};

test("a signed sign-up email request is sent in the journal's design; unsigned ones are refused", async ({
  request,
}) => {
  const email = `hook.${run}@example.test`;
  const body = JSON.stringify({
    user: { id: "00000000-0000-4000-a000-0000000000aa", email, user_metadata: { full_name: "Hook Tester" } },
    email_data: { token: "123456", token_hash: `hash-${run}`, email_action_type: "signup", redirect_to: "" },
  });
  expect((await post(request, body, false)).status()).toBe(401);
  const res = await post(request, body);
  expect(res.status()).toBe(200);
  const db = createClient(URL_!, KEY!, { auth: { persistSession: false } });
  const { data } = await db.from("email_outbox").select("template, subject, status").eq("to_email", email);
  expect(data).toEqual([
    expect.objectContaining({ template: "auth_signup", subject: "Confirm your email address · JHTCS" }),
  ]);
  await db.from("email_outbox").delete().eq("to_email", email);
});
