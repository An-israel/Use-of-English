"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CONFLICT_MESSAGE, dbMessage, type ActionResult } from "@/lib/admin/server";
import { getViewer } from "@/lib/auth";
import { kickJobs } from "@/lib/jobs/kick";
import { adminClient, userClient } from "@/lib/supabase/clients";
import { MAX_FILE_BYTES, PDF, DOCX, RECOMMENDATION_LABEL, safeFileName } from "@/lib/submission";

/**
 * The reviewer's side of peer review. RLS and the guard_review_update trigger
 * ensure a reviewer can only respond to, and complete, their own assignment.
 */

async function ownAssignment(id: string) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const db = await userClient();
  const { data } = await db
    .from("review_assignments")
    .select("id, submission_id, reviewer_id, status, version")
    .eq("id", id)
    .eq("reviewer_id", viewer.id)
    .maybeSingle();
  return data ? { viewer, db, a: data } : null;
}

export async function respondToInvitation(id: string, accept: boolean): Promise<ActionResult> {
  const own = await ownAssignment(id);
  if (!own) return { ok: false, message: "This review request isn’t yours." };
  if (own.a.status !== "invited") return { ok: false, message: "You have already responded to this request." };
  const { error } = await own.db
    .from("review_assignments")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", id)
    .eq("status", "invited");
  if (error) return { ok: false, message: dbMessage(error) };
  revalidatePath(`/review/${id}`);
  revalidatePath("/account");
  return {
    ok: true,
    message: accept ? "Thank you. The manuscript is ready for you below." : "Thank you for letting us know.",
  };
}

const reviewSchema = z.object({
  recommendation: z.enum(Object.keys(RECOMMENDATION_LABEL) as [keyof typeof RECOMMENDATION_LABEL]).optional(),
  toAuthor: z.string().max(20_000),
  toEditor: z.string().max(10_000),
});

export async function saveReview(form: FormData): Promise<ActionResult> {
  const id = String(form.get("id") ?? "");
  const submit = form.get("intent") === "submit";
  const own = await ownAssignment(id);
  if (!own) return { ok: false, message: "This review isn’t yours." };
  if (own.a.status !== "accepted") return { ok: false, message: "This review is closed." };
  const parsed = reviewSchema.safeParse({
    recommendation: form.get("recommendation") || undefined,
    toAuthor: String(form.get("to_author") ?? ""),
    toEditor: String(form.get("to_editor") ?? ""),
  });
  if (!parsed.success) return { ok: false, message: "Your comments are too long." };
  const { recommendation, toAuthor, toEditor } = parsed.data;
  if (submit && !recommendation) return { ok: false, message: "Choose a recommendation before submitting." };
  if (submit && toAuthor.trim().length < 50)
    return { ok: false, message: "Please write at least a few sentences of comments for the author." };

  const { data, error } = await own.db
    .from("review_assignments")
    .update({
      recommendation: recommendation ?? null,
      comments_to_author: toAuthor.trim() || null,
      comments_to_editor: toEditor.trim() || null,
      ...(submit ? { status: "submitted" } : {}),
    })
    .eq("id", id)
    .eq("version", Number(form.get("version")))
    .select("id");
  if (error) return { ok: false, message: dbMessage(error) };
  if (!data?.length) return { ok: false, conflict: true, message: CONFLICT_MESSAGE };
  if (submit) kickJobs();
  revalidatePath(`/review/${id}`);
  return { ok: true, message: submit ? "Review submitted. Thank you." : "Draft saved." };
}

const REPORT_TYPES = [PDF, DOCX];

export async function requestReportUpload(
  id: string,
  file: { name: string; size: number; type: string },
): Promise<{ ok: true; path: string; token: string } | { ok: false; message: string }> {
  const own = await ownAssignment(id);
  if (!own || own.a.status !== "accepted") return { ok: false, message: "You can upload a report while reviewing." };
  if (!REPORT_TYPES.includes(file.type)) return { ok: false, message: "Upload a PDF or Word (.docx) file." };
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return { ok: false, message: "Files must be smaller than 20 MB." };
  const admin = adminClient();
  // Other reviewers' reports are invisible to this reviewer, so number versions with the service role.
  const { data: last } = await admin
    .from("submission_files")
    .select("version")
    .eq("submission_id", own.a.submission_id)
    .eq("kind", "review_report")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const path = `${own.a.submission_id}/review_report/v${(last?.version ?? 0) + 1}-${safeFileName(file.name)}`;
  const { data, error } = await admin.storage.from("submissions").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "Couldn’t prepare the upload. Please try again." };
  await admin.from("pending_uploads").upsert({ storage_path: path, bucket: "submissions", owner_id: own.viewer.id });
  return { ok: true, path, token: data.token };
}

export async function registerReport(id: string, path: string, originalName: string): Promise<ActionResult> {
  const own = await ownAssignment(id);
  if (!own || own.a.status !== "accepted") return { ok: false, message: "You can upload a report while reviewing." };
  if (!path.startsWith(`${own.a.submission_id}/review_report/v`))
    return { ok: false, message: "Unexpected file path." };
  const admin = adminClient();
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await admin.storage.from("submissions").list(folder, { search: name });
  const meta = listed?.find((o) => o.name === name)?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta?.size || meta.size > MAX_FILE_BYTES || !REPORT_TYPES.includes(meta.mimetype ?? "")) {
    if (meta) await admin.storage.from("submissions").remove([path]);
    return { ok: false, message: "The upload didn’t finish or isn’t a PDF or Word file." };
  }
  const { error } = await own.db.from("submission_files").insert({
    submission_id: own.a.submission_id,
    kind: "review_report",
    version: Number(name.match(/^v(\d+)-/)?.[1] ?? 1),
    storage_path: path,
    original_name: originalName.slice(0, 200),
    mime_type: meta.mimetype,
    size_bytes: meta.size,
    visible_to_author: false,
    uploaded_by: own.viewer.id,
  });
  if (error) return { ok: false, message: dbMessage(error, "Couldn’t record the file.") };
  await admin.from("pending_uploads").delete().eq("storage_path", path);
  revalidatePath(`/review/${id}`);
  return { ok: true, message: "Report uploaded." };
}
