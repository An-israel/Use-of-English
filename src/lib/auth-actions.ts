"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { RATE_LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { safeNext } from "@/lib/auth";
import { isDemoMode, siteUrl } from "@/lib/env";
import { logger } from "@/lib/log";
import { userClient } from "@/lib/supabase/clients";

export type FormState = {
  status: "idle" | "ok" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

const DEMO: FormState = {
  status: "error",
  message: "This preview has no database connected, so accounts are not available yet.",
};

const password = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128)
  .refine((p) => /[a-zA-Z]/.test(p) && /[0-9\W]/.test(p), "Mix letters with numbers or symbols.");

function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const pick = (form: FormData, keys: string[]) => Object.fromEntries(keys.map((k) => [k, String(form.get(k) ?? "")]));

async function limited(rule: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS], subject?: string) {
  const h = await headers();
  const byIp = await rateLimit({ headers: h }, rule);
  const bySubject = subject ? await rateLimit({ headers: h }, rule, `${rule.name}:${subject.toLowerCase()}`) : byIp;
  return byIp.allowed && bySubject.allowed ? null : Math.max(byIp.retryAfter, bySubject.retryAfter);
}

const wait = (s: number) => `Too many attempts. Please wait ${Math.max(1, Math.ceil(s / 60))} minute(s) and try again.`;

/* ---------------------------------------------------------------- sign in */

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  if (isDemoMode) return DEMO;
  const values = pick(form, ["email", "next"]);
  const parsed = z
    .object({ email: z.email("Enter your email address."), password: z.string().min(1, "Enter your password.") })
    .safeParse({
      email: values.email,
      password: String(form.get("password") ?? ""),
    });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const retry = await limited(RATE_LIMITS.login, parsed.data.email);
  if (retry) return { status: "error", message: wait(retry), values };

  const supabase = await userClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return {
        status: "error",
        message: "Please confirm your email address first. We can send the link again.",
        values: { ...values, unconfirmed: "1" },
      };
    }
    return { status: "error", message: "That email and password don’t match an account.", values };
  }
  redirect(safeNext(values.next));
}

/* -------------------------------------------------------------- register */

export async function register(_: FormState, form: FormData): Promise<FormState> {
  if (isDemoMode) return DEMO;
  const values = pick(form, ["fullName", "email", "affiliation", "next"]);
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Enter your full name.").max(200),
      email: z.email("Enter a valid email address.").max(320),
      affiliation: z.string().trim().max(300),
      password,
      terms: z.literal("on", { error: "Please accept the privacy policy to continue." }),
    })
    .safeParse({ ...values, password: String(form.get("password") ?? ""), terms: form.get("terms") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const retry = await limited(RATE_LIMITS.signup);
  if (retry) return { status: "error", message: wait(retry), values };

  const supabase = await userClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, affiliation: parsed.data.affiliation || null },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext(values.next))}`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { status: "error", fieldErrors: { password: error.message }, values };
    if (error.code === "over_email_send_rate_limit") {
      return {
        status: "error",
        message: "We have sent a lot of emails in the last hour. Please try again a little later.",
        values,
      };
    }
    logger.warn({ code: error.code }, "sign-up failed");
    return { status: "error", message: "We couldn’t create your account just now. Please try again shortly.", values };
  }
  // Same response whether or not the address already has an account (no enumeration).
  return {
    status: "ok",
    message: `We have sent a confirmation link to ${parsed.data.email}. Open it to finish creating your account.`,
  };
}

export async function resendConfirmation(_: FormState, form: FormData): Promise<FormState> {
  if (isDemoMode) return DEMO;
  const email = String(form.get("email") ?? "");
  if (!z.email().safeParse(email).success) return { status: "error", message: "Enter your email address above first." };
  const retry = await limited(RATE_LIMITS.signup, email);
  if (retry) return { status: "error", message: wait(retry) };
  const supabase = await userClient();
  await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/account` },
  });
  return { status: "ok", message: "If that address has an unconfirmed account, a new link is on its way." };
}

/* ------------------------------------------------------ password reset */

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  if (isDemoMode) return DEMO;
  const email = String(form.get("email") ?? "");
  if (!z.email().safeParse(email).success) {
    return { status: "error", fieldErrors: { email: "Enter a valid email address." }, values: { email } };
  }
  const retry = await limited(RATE_LIMITS.passwordReset, email);
  if (retry) return { status: "error", message: wait(retry), values: { email } };
  const supabase = await userClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });
  if (error) logger.warn({ code: error.code }, "password reset request failed");
  return { status: "ok", message: `If ${email} has a JHTS account, a link to reset your password is on its way.` };
}

/** Sets a new password for the signed-in user (after a recovery or invitation link). */
export async function setPassword(_: FormState, form: FormData): Promise<FormState> {
  if (isDemoMode) return DEMO;
  const values = pick(form, ["next", "fullName", "affiliation"]);
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "The passwords don’t match." })
    .safeParse({ password: String(form.get("password") ?? ""), confirm: String(form.get("confirm") ?? "") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await userClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return { status: "error", message: "This link has expired. Please request a new one.", values };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message: error.code === "same_password" ? "Choose a password you haven’t used before." : error.message,
      values,
    };
  }
  if (values.fullName) {
    await supabase
      .from("profiles")
      .update({
        full_name: values.fullName.trim().slice(0, 200),
        affiliation: values.affiliation?.trim().slice(0, 300) || null,
      })
      .eq("id", claims.claims.sub);
  }
  redirect(safeNext(values.next));
}

/* -------------------------------------------------------- OAuth, sign out */

export async function signInWithGoogle(form: FormData) {
  if (isDemoMode) return;
  const supabase = await userClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(
        safeNext(
          z
            .string()
            .max(500)
            .catch("")
            .parse(form.get("next") ?? ""),
        ),
      )}`,
    },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function signOut() {
  if (!isDemoMode) {
    const supabase = await userClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
