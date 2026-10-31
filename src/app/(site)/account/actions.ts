"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import type { FormState } from "@/lib/auth-actions";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/log";
import { adminClient, userClient } from "@/lib/supabase/clients";
import { STAFF_ROLES } from "@/lib/workflow";

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

/**
 * "Delete my account" (I4, Nigeria Data Protection Act 2023, right to
 * erasure). Drafts and their files are deleted. If nothing else is left, the
 * account is deleted outright. Submitted manuscripts, reviews and payments
 * must be kept for the scholarly and financial record, so in that case the
 * profile is anonymised and sign-in is blocked instead.
 */
export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { status: "error", message: "Your session has ended. Please sign in again." };
  if (STAFF_ROLES.includes(viewer.role))
    return {
      status: "error",
      message: "Staff accounts are closed by a Super Admin, so that the editorial office is never left without one.",
    };
  const confirmed = z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.literal("DELETE"))
    .safeParse(String(form.get("confirm") ?? ""));
  if (!confirmed.success) return { status: "error", fieldErrors: { confirm: "Type DELETE to confirm." } };

  const db = adminClient();
  const id = viewer.id;
  try {
    // 1. Drafts and their files.
    const { data: drafts, error: draftError } = await db
      .from("submissions")
      .select("id, files:submission_files ( storage_path )")
      .eq("author_id", id)
      .eq("status", "draft");
    if (draftError) throw new Error(draftError.message);
    for (const d of drafts ?? []) {
      const paths = (d.files as { storage_path: string }[]).map((f) => f.storage_path);
      if (paths.length) await db.storage.from("submissions").remove(paths);
      const { error } = await db.from("submissions").delete().eq("id", d.id).eq("status", "draft");
      if (error) throw new Error(error.message);
    }

    // 2. Anything that must be kept?
    const count = async (table: string, column: string) => {
      const { count: n, error } = await db.from(table).select("id", { count: "exact", head: true }).eq(column, id);
      if (error) throw new Error(error.message);
      return n ?? 0;
    };
    const kept =
      (await count("submissions", "author_id")) +
      (await count("payments", "author_id")) +
      (await count("review_assignments", "reviewer_id"));

    // Sign out everywhere before the account changes.
    await (await userClient()).auth.signOut({ scope: "global" });

    let deleted = false;
    if (kept === 0) {
      const { error } = await db.auth.admin.deleteUser(id);
      deleted = !error;
      if (error) logger.warn({ err: error.message }, "account delete fell back to anonymising");
    }
    if (!deleted) {
      const placeholder = `deleted-${id}@deleted.invalid`;
      const { error: profileError } = await db
        .from("profiles")
        .update({
          full_name: "Deleted account",
          email: placeholder,
          affiliation: null,
          orcid: null,
          expertise: [],
          is_active: false,
        })
        .eq("id", id);
      if (profileError) throw new Error(profileError.message);
      await db.from("saved_filters").delete().eq("owner_id", id);
      const { error: authError } = await db.auth.admin.updateUserById(id, {
        email: placeholder,
        email_confirm: true,
        user_metadata: {},
        ban_duration: "876000h",
      });
      if (authError) throw new Error(authError.message);
    }
    logger.info({ userId: id, mode: deleted ? "deleted" : "anonymised" }, "account deleted at the user's request");
  } catch (err) {
    logger.error({ err, userId: id }, "account deletion failed");
    return {
      status: "error",
      message: "We couldn’t delete your account just now. Please try again, or write to the editorial office.",
    };
  }
  redirect("/goodbye");
}
