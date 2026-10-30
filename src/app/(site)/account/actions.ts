"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import type { FormState } from "@/lib/auth-actions";
import { siteUrl } from "@/lib/env";
import { userClient } from "@/lib/supabase/clients";

const orcid = z
  .string()
  .trim()
  .transform((s) => s.replace(/^https?:\/\/orcid\.org\//, ""))
  .refine((s) => s === "" || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(s), "Use the form 0000-0002-1825-0097.");

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Your session has ended. Please sign in again." };
  const values = Object.fromEntries(["fullName", "affiliation", "orcid"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = z
    .object({
      fullName: z.string().trim().min(2, "Enter your full name.").max(200),
      affiliation: z.string().trim().max(300),
      orcid,
    })
    .safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { status: "error", fieldErrors, values };
  }
  const supabase = await userClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      affiliation: parsed.data.affiliation || null,
      orcid: parsed.data.orcid || null,
    })
    .eq("id", viewer.id);
  if (error) return { status: "error", message: "We couldn’t save your profile. Please try again.", values };
  revalidatePath("/account");
  return { status: "ok", message: "Profile saved.", values };
}

export async function changeEmail(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Your session has ended. Please sign in again." };
  const email = String(form.get("email") ?? "").trim();
  if (!z.email().safeParse(email).success)
    return { status: "error", fieldErrors: { email: "Enter a valid email address." }, values: { email } };
  if (email.toLowerCase() === viewer.email.toLowerCase())
    return { status: "error", message: "That is already your email address.", values: { email } };
  const supabase = await userClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${siteUrl}/auth/callback?next=/account` },
  );
  if (error) return { status: "error", message: error.message, values: { email } };
  return {
    status: "ok",
    message: `We have sent confirmation links to ${viewer.email} and ${email}. The change takes effect once both are confirmed.`,
  };
}
