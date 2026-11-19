import { describe, expect, it } from "vitest";
import { AuthHookPayload, authEmails, hookSecret } from "@/lib/email/auth-hook";
import { signWebhook, verifyWebhook } from "@/lib/email/webhook";

const SITE = "https://jhtcs.org";
const payload = (action: string, extra: Partial<Record<string, string>> = {}, user: Record<string, unknown> = {}) =>
  AuthHookPayload.parse({
    user: { id: "u1", email: "ada@example.test", user_metadata: { full_name: "Ada Okafor" }, ...user },
    email_data: {
      token: "123456",
      token_hash: "hash-1",
      redirect_to: "https://evil.example/steal",
      email_action_type: action,
      site_url: "https://evil.example",
      ...extra,
    },
  });

describe("Supabase Send Email hook", () => {
  it("signup links to /auth/confirm on our own site, whatever the payload says", () => {
    const [e] = authEmails(payload("signup"), SITE);
    expect(e).toMatchObject({ to: "ada@example.test", kind: "signup", name: "Ada Okafor" });
    const u = new URL(e.link!);
    expect(u.origin).toBe(SITE);
    expect(u.pathname).toBe("/auth/confirm");
    expect(Object.fromEntries(u.searchParams)).toEqual({ token_hash: "hash-1", type: "email", next: "/account" });
  });

  it.each([
    ["recovery", "recovery", "/reset-password"],
    ["invite", "invite", "/account/welcome"],
    ["magiclink", "magiclink", "/account"],
  ])("%s goes to the right page", (action, type, next) => {
    const u = new URL(authEmails(payload(action), SITE)[0].link!);
    expect(u.searchParams.get("type")).toBe(type);
    expect(u.searchParams.get("next")).toBe(next);
  });

  it("a secure email change mails both addresses with the right token each", () => {
    const out = authEmails(
      payload("email_change", { token_hash_new: "hash-current" }, { new_email: "ada.new@example.test" }),
      SITE,
    );
    expect(out.map((e) => [e.to, new URL(e.link!).searchParams.get("token_hash")])).toEqual([
      ["ada@example.test", "hash-current"],
      ["ada.new@example.test", "hash-1"],
    ]);
  });

  it("reauthentication sends the code, not a link", () => {
    expect(authEmails(payload("reauthentication"), SITE)[0]).toMatchObject({ link: null, code: "123456" });
  });

  it("unknown actions send nothing", () => {
    expect(authEmails(payload("something_new"), SITE)).toEqual([]);
  });

  it("verifies Supabase's v1,whsec_ secret and rejects tampering", () => {
    const secret = `v1,whsec_${Buffer.from("hook-secret-0123456789abcdef").toString("base64")}`;
    const body = JSON.stringify({ hello: "world" });
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = `v1,${signWebhook(hookSecret(secret), "msg_1", ts, body)}`;
    expect(verifyWebhook(hookSecret(secret), { id: "msg_1", timestamp: ts, signature: sig }, body)).toBe(true);
    expect(verifyWebhook(hookSecret(secret), { id: "msg_1", timestamp: ts, signature: sig }, body + " ")).toBe(false);
  });
});
