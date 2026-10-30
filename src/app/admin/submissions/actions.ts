"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { getFlags, getSettings } from "@/lib/data";
import { kickJobs } from "@/lib/jobs/kick";
import { userClient } from "@/lib/supabase/clients";
import { STATUSES, STATUS_LABEL, editorTransitions, type SubmissionStatus } from "@/lib/workflow";

type Result = { ok: boolean; message: string };

/**
 * Editors move submissions along the workflow and message the author. RLS
 * limits who may update (editors; book-review editors for book reviews only),
 * and the allowed moves come from lib/workflow.
 */
export async function changeStatus(_: Result | null, form: FormData): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer || !["super_admin", "editor", "book_review_editor"].includes(viewer.role))
    return { ok: false, message: "Not allowed." };
  const parsed = z
    .object({ id: z.uuid(), to: z.enum(STATUSES), message: z.string().max(4000), reason: z.string().max(2000) })
    .safeParse({
      id: form.get("id"),
      to: form.get("to"),
      message: form.get("message") ?? "",
      reason: form.get("reason") ?? "",
    });
  if (!parsed.success) return { ok: false, message: "Choose a new status." };
  const { id, to, message, reason } = parsed.data;

  const supabase = await userClient();
  const { data: s } = await supabase.from("submissions").select("status, version").eq("id", id).maybeSingle();
  if (!s) return { ok: false, message: "Submission not found." };
  const [settings, flags] = await Promise.all([getSettings(), getFlags()]);
  const allowed = editorTransitions(s.status as SubmissionStatus, settings.fees.enabled && flags.fees_enabled);
  if (!allowed.includes(to))
    return {
      ok: false,
      message: `You can’t move this submission from “${STATUS_LABEL[s.status as SubmissionStatus]}” to “${STATUS_LABEL[to]}”.`,
    };
  if (to === "rejected" && !reason.trim()) return { ok: false, message: "Give a reason for the rejection." };

  const patch: Record<string, unknown> = { status: to };
  if (to === "accepted_awaiting_fee" || (to === "in_production" && s.status !== "accepted_awaiting_fee"))
    patch.accepted_at = new Date().toISOString().slice(0, 10);
  if (to === "rejected") {
    patch.rejection_reason = reason.trim();
    patch.decided_at = new Date().toISOString();
  }
  // Optimistic lock: fails if someone else changed it since the page loaded (item 36).
  const { data: updated, error } = await supabase
    .from("submissions")
    .update(patch)
    .eq("id", id)
    .eq("version", s.version)
    .select("id");
  if (error) return { ok: false, message: "The status could not be changed." };
  if (!updated?.length)
    return { ok: false, message: "Someone else changed this submission. Reload the page and try again." };

  const note = [to === "rejected" ? reason.trim() : "", message.trim()].filter(Boolean).join("\n\n");
  if (note)
    await supabase
      .from("submission_events")
      .insert({ submission_id: id, actor_id: viewer.id, message: note, visibility: "author" });
  kickJobs();
  revalidatePath(`/admin/submissions/${id}`);
  return { ok: true, message: `Moved to “${STATUS_LABEL[to]}”. The author has been notified.` };
}

export async function addNote(_: Result | null, form: FormData): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Not allowed." };
  const id = String(form.get("id") ?? "");
  const message = String(form.get("message") ?? "").trim();
  const visibility = form.get("visibility") === "internal" ? "internal" : "author";
  if (message.length < 2) return { ok: false, message: "Write a message first." };
  const { error } = await (
    await userClient()
  )
    .from("submission_events")
    .insert({ submission_id: id, actor_id: viewer.id, message: message.slice(0, 4000), visibility });
  if (error) return { ok: false, message: "Couldn’t save the message." };
  revalidatePath(`/admin/submissions/${id}`);
  return { ok: true, message: visibility === "author" ? "Message sent to the author." : "Internal note saved." };
}

export async function waiveFee(_: Result | null, form: FormData): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer || !["super_admin", "editor"].includes(viewer.role))
    return { ok: false, message: "Only editors can waive fees." };
  const id = String(form.get("id") ?? "");
  const fee = form.get("fee") === "publication" ? "publication" : "review";
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 5) return { ok: false, message: "Give a reason for the waiver (at least a few words)." };
  const { error } = await (
    await userClient()
  ).rpc("waive_fee", { p_submission: id, p_fee: fee, p_reason: reason.slice(0, 1000) });
  if (error) return { ok: false, message: error.message };
  kickJobs();
  revalidatePath(`/admin/submissions/${id}`);
  return { ok: true, message: `${fee === "review" ? "Review" : "Publication"} fee waived.` };
}
