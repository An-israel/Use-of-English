/**
 * Supabase Auth's "Send Email" hook: instead of sending sign-up, password
 * reset, invitation and email-change messages itself (which needs SMTP),
 * Supabase posts them here and the site sends them through Resend in the
 * journal's own design. This module is the pure part: which emails, to whom,
 * with which link. The route checks the signature and sends.
 */
import { z } from "zod";

export const AuthHookPayload = z.object({
  user: z.object({
    id: z.string().max(100),
    email: z.string().max(320).optional().default(""),
    new_email: z.string().max(320).optional().nullable(),
    user_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  }),
  email_data: z.object({
    token: z.string().max(100).optional().default(""),
    token_hash: z.string().max(500).optional().default(""),
    redirect_to: z.string().max(2000).optional().default(""),
    email_action_type: z.string().max(50),
    site_url: z.string().max(2000).optional().default(""),
    token_new: z.string().max(100).optional().default(""),
    token_hash_new: z.string().max(500).optional().default(""),
  }),
});
export type AuthHookPayload = z.infer<typeof AuthHookPayload>;

export type AuthEmailKind = "signup" | "recovery" | "invite" | "magiclink" | "email_change" | "reauthentication";

export type AuthEmail = {
  to: string;
  kind: AuthEmailKind;
  subject: string;
  /** The link to click, or null when the email carries a code instead (reauthentication). */
  link: string | null;
  code: string | null;
  name: string;
  /** For email changes: the address the account is moving to. */
  newEmail?: string;
};

/** Where each kind of link lands after /auth/confirm signs the person in. */
const ROUTE: Record<Exclude<AuthEmailKind, "reauthentication">, { type: string; next: string }> = {
  signup: { type: "email", next: "/account" },
  recovery: { type: "recovery", next: "/reset-password" },
  invite: { type: "invite", next: "/account/welcome" },
  magiclink: { type: "magiclink", next: "/account" },
  email_change: { type: "email_change", next: "/account" },
};

const SUBJECT: Record<AuthEmailKind, string> = {
  signup: "Confirm your email address · JHTCS",
  recovery: "Reset your JHTCS password",
  invite: "You have been invited to JHTCS",
  magiclink: "Your JHTCS sign-in link",
  email_change: "Confirm your new email address · JHTCS",
  reauthentication: "Your JHTCS confirmation code",
};

function confirmLink(siteUrl: string, tokenHash: string, kind: Exclude<AuthEmailKind, "reauthentication">) {
  const { type, next } = ROUTE[kind];
  const u = new URL("/auth/confirm", siteUrl);
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", type);
  u.searchParams.set("next", next);
  return u.toString();
}

function kindOf(action: string): AuthEmailKind | null {
  if (action === "signup" || action === "email") return "signup";
  if (action === "recovery" || action === "invite" || action === "magiclink" || action === "reauthentication")
    return action;
  if (action === "email_change" || action === "email_change_new" || action === "email_change_current")
    return "email_change";
  return null;
}

/**
 * The emails one hook call asks for. Links always point at our own site
 * (siteUrl from the server's settings, never the payload), so a forged
 * redirect can't send people elsewhere.
 */
export function authEmails(p: AuthHookPayload, siteUrl: string): AuthEmail[] {
  const kind = kindOf(p.email_data.email_action_type);
  if (!kind) return [];
  const name = typeof p.user.user_metadata?.full_name === "string" ? p.user.user_metadata.full_name : "";
  const base = { kind, subject: SUBJECT[kind], name, code: null as string | null };
  const d = p.email_data;

  if (kind === "reauthentication") {
    return p.user.email && d.token ? [{ ...base, to: p.user.email, link: null, code: d.token }] : [];
  }
  if (kind === "email_change") {
    const newEmail = p.user.new_email ?? "";
    const out: AuthEmail[] = [];
    // With "secure email change" on, both addresses must confirm. Supabase's
    // naming is historical: token_hash_new goes to the CURRENT address and
    // token_hash to the NEW one.
    if (d.token_hash_new && p.user.email)
      out.push({ ...base, to: p.user.email, link: confirmLink(siteUrl, d.token_hash_new, kind), newEmail });
    if (d.token_hash && (newEmail || p.user.email))
      out.push({ ...base, to: newEmail || p.user.email, link: confirmLink(siteUrl, d.token_hash, kind), newEmail });
    return out;
  }
  if (!p.user.email || !d.token_hash) return [];
  return [{ ...base, to: p.user.email, link: confirmLink(siteUrl, d.token_hash, kind) }];
}

/** Supabase shows the hook secret as "v1,whsec_<base64>"; the HMAC key is the base64 part. */
export function hookSecret(raw: string): string {
  return raw.trim().replace(/^v1,/, "");
}
