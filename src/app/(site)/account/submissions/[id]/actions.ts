"use server";

import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { kickJobs } from "@/lib/jobs/kick";
import { adminClient, userClient } from "@/lib/supabase/clients";
import { FILE_KINDS, MAX_FILE_BYTES, safeFileName } from "@/lib/submission";

type Result = { ok: true; message?: string } | { ok: false; message: string };

async function own(id: string) {
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await userClient();
  const { data } = await supabase.from("submissions").select("id, author_id, status").eq("id", id).maybeSingle();
  if (!data || data.author_id !== viewer.id) return null;
  return { viewer, supabase, submission: data };
}

export async function requestRevisionUpload(id: string, file: { name: string; size: number; type: string }) {
  const o = await own(id);
  if (!o) return { ok: false as const, message: "Submission not found." };
  if (o.submission.status !== "revisions_requested")
    return { ok: false as const, message: "Revisions are not being requested." };
  if (!(FILE_KINDS.revision.types as readonly string[]).includes(file.type))
    return { ok: false as const, message: FILE_KINDS.revision.hint };
  if (file.size <= 0 || file.size > MAX_FILE_BYTES)
    return { ok: false as const, message: "Files must be smaller than 20 MB." };
  const { data: last } = await o.supabase
    .from("submission_files")
    .select("version")
    .eq("submission_id", id)
    .eq("kind", "revision")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const path = `${id}/revision/v${(last?.version ?? 0) + 1}-${safeFileName(file.name)}`;
  const { data, error } = await adminClient().storage.from("submissions").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, message: "Couldn’t prepare the upload." };
  return { ok: true as const, path, token: data.token };
}

export async function registerRevision(id: string, path: string, originalName: string, note: string): Promise<Result> {
  const o = await own(id);
  if (!o) return { ok: false, message: "Submission not found." };
  if (!path.startsWith(`${id}/revision/v`)) return { ok: false, message: "Unexpected file path." };
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await adminClient().storage.from("submissions").list(folder, { search: name });
  const meta = listed?.find((x) => x.name === name)?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta?.size) return { ok: false, message: "The upload didn’t finish. Please try again." };
  const { error } = await o.supabase.from("submission_files").insert({
    submission_id: id,
    kind: "revision",
    version: Number(name.match(/^v(\d+)-/)?.[1] ?? 1),
    storage_path: path,
    original_name: originalName.slice(0, 200),
    mime_type: meta.mimetype,
    size_bytes: meta.size,
    uploaded_by: o.viewer.id,
  });
  if (error) return { ok: false, message: "Couldn’t record the file." };
  const { error: rpcErr } = await o.supabase.rpc("submit_revision", { p_submission: id, p_note: note });
  if (rpcErr) return { ok: false, message: rpcErr.message };
  kickJobs();
  revalidatePath(`/account/submissions/${id}`);
  return { ok: true, message: "Revised manuscript sent to the editors." };
}

export async function sendMessage(_: Result | null, form: FormData): Promise<Result> {
  const id = String(form.get("id") ?? "");
  const message = String(form.get("message") ?? "").trim();
  const o = await own(id);
  if (!o) return { ok: false, message: "Submission not found." };
  if (message.length < 2) return { ok: false, message: "Write a message first." };
  const { error } = await o.supabase
    .from("submission_events")
    .insert({ submission_id: id, actor_id: o.viewer.id, message: message.slice(0, 4000), visibility: "author" });
  if (error) return { ok: false, message: "Couldn’t send the message." };
  revalidatePath(`/account/submissions/${id}`);
  return { ok: true, message: "Message sent to the editorial office." };
}

export async function withdraw(_: Result | null, form: FormData): Promise<Result> {
  const id = String(form.get("id") ?? "");
  const o = await own(id);
  if (!o) return { ok: false, message: "Submission not found." };
  const { error } = await o.supabase.rpc("withdraw_submission", {
    p_submission: id,
    p_reason: String(form.get("reason") ?? "").slice(0, 1000) || null,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/account/submissions/${id}`);
  return { ok: true, message: "Your submission has been withdrawn." };
}
