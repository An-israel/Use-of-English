"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CONTENT_EDITORS, dbMessage, denied, lockedUpdate, staff, type ActionResult } from "@/lib/admin/server";
import { kickJobs } from "@/lib/jobs/kick";
import { adminClient } from "@/lib/supabase/clients";
import { MAX_FILE_BYTES, STAFF_FILE_KINDS, safeFileName, type StaffUploadKind } from "@/lib/submission";

/**
 * Editorial actions on one submission: reviewers, plagiarism data, files for
 * the author, dates and the article created from it. RLS (can_manage_submission)
 * decides which submissions each editor may touch.
 */

const refresh = (id: string) => revalidatePath(`/admin/submissions/${id}`);

export async function inviteReviewer(form: FormData): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({
      id: z.uuid(),
      reviewer: z.uuid("Choose a reviewer."),
      due: z.iso.date("Choose a due date."),
      round: z.coerce.number().int().min(1).max(9),
    })
    .safeParse({ id: form.get("id"), reviewer: form.get("reviewer"), due: form.get("due"), round: form.get("round") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, reviewer, due, round } = parsed.data;
  if (Date.parse(due) < Date.now()) return { ok: false, message: "The due date must be in the future." };

  const { data: sub } = await s.db.from("submissions").select("author_id, status").eq("id", id).maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  // Conflict of interest: nobody reviews their own manuscript.
  if (sub.author_id === reviewer) return { ok: false, message: "The author can’t review their own submission." };
  const { data: person } = await s.db
    .from("profiles")
    .select("role, is_active, full_name")
    .eq("id", reviewer)
    .maybeSingle();
  if (!person?.is_active || !["reviewer", "editor", "super_admin", "book_review_editor"].includes(person.role))
    return { ok: false, message: "That person isn’t an active reviewer." };

  const { error } = await s.db.from("review_assignments").insert({
    submission_id: id,
    reviewer_id: reviewer,
    round,
    due_at: new Date(`${due}T23:59:00+01:00`).toISOString(),
    invited_by: s.viewer.id,
  });
  if (error)
    return {
      ok: false,
      message: error.code === "23505" ? "This reviewer is already assigned for this round." : dbMessage(error),
    };
  if (sub.status === "plagiarism_check" || sub.status === "under_screening" || sub.status === "revised_received") {
    // Assigning a reviewer is what "under peer review" means.
    await s.db.from("submissions").update({ status: "under_peer_review" }).eq("id", id);
  }
  kickJobs();
  refresh(id);
  return { ok: true, message: `${person.full_name || "The reviewer"} has been invited by email.` };
}

export async function cancelReview(assignmentId: string, submissionId: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { error } = await s.db
    .from("review_assignments")
    .update({ status: "cancelled" })
    .eq("id", assignmentId)
    .in("status", ["invited", "accepted"]);
  if (error) return { ok: false, message: dbMessage(error) };
  refresh(submissionId);
  return { ok: true, message: "Review cancelled." };
}

export async function extendReview(assignmentId: string, submissionId: string, days: number): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { data } = await s.db.from("review_assignments").select("due_at").eq("id", assignmentId).maybeSingle();
  if (!data) return { ok: false, message: "Review not found." };
  const due = new Date(Math.max(Date.parse(data.due_at), Date.now()) + days * 86_400_000).toISOString();
  const { error } = await s.db.from("review_assignments").update({ due_at: due }).eq("id", assignmentId);
  if (error) return { ok: false, message: dbMessage(error) };
  refresh(submissionId);
  return { ok: true, message: `Due date moved by ${days} days.` };
}

/** Send a reviewer's comments to the author as a message, without the reviewer's name. */
export async function shareReviewComments(
  assignmentId: string,
  submissionId: string,
  label: string,
): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { data } = await s.db
    .from("review_assignments")
    .select("comments_to_author, status, submission_id")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!data || data.submission_id !== submissionId) return { ok: false, message: "Review not found." };
  if (data.status !== "submitted" || !data.comments_to_author?.trim())
    return { ok: false, message: "This review has no comments for the author yet." };
  const { error } = await s.db.from("submission_events").insert({
    submission_id: submissionId,
    actor_id: s.viewer.id,
    visibility: "author",
    message: `${label} comments:\n\n${data.comments_to_author.trim()}`,
  });
  if (error) return { ok: false, message: dbMessage(error) };
  refresh(submissionId);
  return { ok: true, message: `${label}’s comments were shared with the author (anonymously).` };
}

export async function saveEditorial(form: FormData): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const id = String(form.get("id") ?? "");
  const version = Number(form.get("version"));
  const sim = String(form.get("similarity") ?? "").trim();
  const similarity = sim === "" ? null : Number(sim);
  if (similarity !== null && (!Number.isFinite(similarity) || similarity < 0 || similarity > 100))
    return { ok: false, message: "Similarity must be a percentage from 0 to 100." };
  const date = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  };
  const editor = String(form.get("handling_editor") ?? "");
  const r = await lockedUpdate(s.db, "submissions", id, version, {
    similarity_percent: similarity,
    received_at: date("received_at"),
    accepted_at: date("accepted_at"),
    handling_editor_id: /^[0-9a-f-]{36}$/.test(editor) ? editor : null,
  });
  if (r.ok) refresh(id);
  return r.ok ? { ok: true, message: "Editorial details saved." } : r;
}

export async function requestStaffUpload(
  id: string,
  kind: StaffUploadKind,
  file: { name: string; size: number; type: string },
): Promise<{ ok: true; path: string; token: string } | { ok: false; message: string }> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return { ok: false, message: denied.message };
  const spec = STAFF_FILE_KINDS[kind];
  if (!spec) return { ok: false, message: "Unknown file type." };
  if (!(spec.types as readonly string[]).includes(file.type)) return { ok: false, message: spec.hint };
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return { ok: false, message: "Files must be smaller than 20 MB." };
  const { data: sub } = await s.db.from("submissions").select("id").eq("id", id).maybeSingle();
  if (!sub) return { ok: false, message: "Submission not found." };
  const { data: last } = await s.db
    .from("submission_files")
    .select("version")
    .eq("submission_id", id)
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const path = `${id}/${kind}/v${(last?.version ?? 0) + 1}-${safeFileName(file.name)}`;
  const admin = adminClient();
  const { data, error } = await admin.storage.from("submissions").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "Couldn’t prepare the upload. Please try again." };
  await admin.from("pending_uploads").upsert({ storage_path: path, bucket: "submissions", owner_id: s.viewer.id });
  return { ok: true, path, token: data.token };
}

export async function registerStaffUpload(
  id: string,
  kind: StaffUploadKind,
  path: string,
  originalName: string,
): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const spec = STAFF_FILE_KINDS[kind];
  if (!spec || !path.startsWith(`${id}/${kind}/v`)) return { ok: false, message: "Unexpected file path." };
  const admin = adminClient();
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await admin.storage.from("submissions").list(folder, { search: name });
  const meta = listed?.find((o) => o.name === name)?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta?.size) return { ok: false, message: "The upload didn’t finish. Please try again." };
  if (meta.size > MAX_FILE_BYTES || !(spec.types as readonly string[]).includes(meta.mimetype ?? "")) {
    await admin.storage.from("submissions").remove([path]);
    return { ok: false, message: "That file type or size isn’t accepted." };
  }
  const { error } = await s.db.from("submission_files").insert({
    submission_id: id,
    kind,
    version: Number(name.match(/^v(\d+)-/)?.[1] ?? 1),
    storage_path: path,
    original_name: originalName.slice(0, 200),
    mime_type: meta.mimetype,
    size_bytes: meta.size,
    visible_to_author: spec.visibleToAuthor,
    uploaded_by: s.viewer.id,
  });
  if (error) return { ok: false, message: dbMessage(error, "Couldn’t record the file.") };
  await admin.from("pending_uploads").delete().eq("storage_path", path);
  if (spec.visibleToAuthor)
    await s.db.from("submission_events").insert({
      submission_id: id,
      actor_id: s.viewer.id,
      visibility: "author",
      message: "The editors have shared the reviewers’ comments. You can download them from the files list.",
    });
  kickJobs();
  refresh(id);
  return { ok: true, message: `${spec.label} uploaded.` };
}

export async function createArticleFromSubmission(id: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { data, error } = await s.db.rpc("article_from_submission", { p_submission: id });
  if (error || !data) return { ok: false, message: dbMessage(error, "Couldn’t create the article.") };
  refresh(id);
  return { ok: true, message: "Draft article created from the submission.", id: data as string };
}
