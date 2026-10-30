"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, type Viewer } from "@/lib/auth";
import type { FormState } from "@/lib/auth-actions";
import { siteUrl } from "@/lib/env";
import { logger } from "@/lib/log";
import { adminClient } from "@/lib/supabase/clients";
import { ROLES, ROLE_LABEL, invitableRoles, type Role } from "@/lib/workflow";

/**
 * Invitations and role changes. Every action re-checks the caller's role on
 * the server before using the service role; the database separately refuses
 * to drop the last Super Admin.
 */

async function audit(actor: Viewer, action: string, rowId: string, changes: Record<string, unknown>) {
  await adminClient().from("audit_log").insert({
    actor_id: actor.id,
    actor_email: actor.email,
    action,
    table_name: "profiles",
    row_id: rowId,
    changes,
  });
}

export async function inviteUser(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  const allowed = viewer ? invitableRoles(viewer.role) : [];
  if (!viewer || allowed.length === 0)
    return { status: "error", message: "You don’t have permission to invite people." };

  const values = Object.fromEntries(["email", "fullName", "role"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = z
    .object({
      email: z.email("Enter a valid email address.").max(320),
      fullName: z.string().trim().min(2, "Enter their name.").max(200),
      role: z.enum(ROLES).refine((r) => allowed.includes(r), "You can’t give this role."),
    })
    .safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { status: "error", fieldErrors, values };
  }
  const { email, fullName, role } = parsed.data;
  const admin = adminClient();

  const { data: existing } = await admin.from("profiles").select("id, role").eq("email", email).maybeSingle();
  if (existing) {
    if (existing.role === role) return { status: "ok", message: `${email} already has the ${ROLE_LABEL[role]} role.` };
    // Editors may only turn authors into reviewers; Super Admins may change any role.
    if (viewer.role !== "super_admin" && existing.role !== "author") {
      return {
        status: "error",
        message: "This person already has a staff role. Ask a Super Admin to change it.",
        values,
      };
    }
    const { error } = await admin.from("profiles").update({ role }).eq("id", existing.id);
    if (error) return { status: "error", message: error.message, values };
    await admin.auth.admin.updateUserById(existing.id, { app_metadata: { jhts_role: role } });
    await audit(viewer, "role_change", existing.id, { role: { from: existing.role, to: role } });
    revalidatePath("/admin/users");
    return { status: "ok", message: `${email} already had an account and is now a ${ROLE_LABEL[role]}.` };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${siteUrl}/account/welcome`,
  });
  if (error || !data.user) {
    logger.error({ err: error }, "invitation failed");
    return { status: "error", message: "The invitation could not be sent. Please try again.", values };
  }
  // app_metadata is writable only with the service role, so nobody can grant themselves a role.
  await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { jhts_role: role } });
  await admin.from("profiles").update({ role, full_name: fullName, invited_by: viewer.id }).eq("id", data.user.id);
  await audit(viewer, "invite", data.user.id, { email, role });
  revalidatePath("/admin/users");
  return { status: "ok", message: `Invitation sent to ${email} as ${ROLE_LABEL[role]}.` };
}

export async function changeRole(userId: string, role: Role): Promise<{ ok: boolean; message: string }> {
  const viewer = await getViewer();
  if (viewer?.role !== "super_admin") return { ok: false, message: "Only a Super Admin can change roles." };
  if (!ROLES.includes(role)) return { ok: false, message: "Unknown role." };
  const admin = adminClient();
  const { data: before } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (error) {
    return {
      ok: false,
      message: error.message.includes("at least one active Super Admin")
        ? "There must always be at least one active Super Admin."
        : "The role could not be changed.",
    };
  }
  await admin.auth.admin.updateUserById(userId, { app_metadata: { jhts_role: role } });
  await audit(viewer, "role_change", userId, { role: { from: before?.role, to: role } });
  revalidatePath("/admin/users");
  return { ok: true, message: `Role changed to ${ROLE_LABEL[role]}.` };
}

export async function setActive(userId: string, active: boolean): Promise<{ ok: boolean; message: string }> {
  const viewer = await getViewer();
  if (viewer?.role !== "super_admin") return { ok: false, message: "Only a Super Admin can deactivate accounts." };
  if (userId === viewer.id && !active) return { ok: false, message: "You can’t deactivate your own account." };
  const admin = adminClient();
  const { error } = await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) {
    return {
      ok: false,
      message: error.message.includes("at least one active Super Admin")
        ? "There must always be at least one active Super Admin."
        : "The account could not be updated.",
    };
  }
  // A ban also ends existing sessions at their next refresh.
  await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  await audit(viewer, active ? "reactivate" : "deactivate", userId, { is_active: active });
  revalidatePath("/admin/users");
  return { ok: true, message: active ? "Account reactivated." : "Account deactivated." };
}
