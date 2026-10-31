"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RATE_LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { getViewer } from "@/lib/auth";
import { getFlags } from "@/lib/data";
import { kickJobs } from "@/lib/jobs/kick";
import { logger } from "@/lib/log";
import { adminClient, userClient } from "@/lib/supabase/clients";
import {
  DECLARATIONS,
  FILE_KINDS,
  MAX_FILE_BYTES,
  authorsSchema,
  detailsSchema,
  safeFileName,
  type UploadKind,
} from "@/lib/submission";
import { z } from "zod";
import { Id, INVALID, StoragePath, UploadFile, UploadKindSchema, validArgs } from "@/lib/validation";

type Result = { ok: true; message?: string } | { ok: false; message: string; fieldErrors?: Record<string, string> };

const fail = (message: string, fieldErrors?: Record<string, string>): Result => ({ ok: false, message, fieldErrors });

async function ownDraft(id: string) {
  const viewer = await getViewer();
  if (!viewer) return { error: fail("Your session has ended. Please sign in again.") } as const;
  const supabase = await userClient();
  const { data } = await supabase.from("submissions").select("id, status, author_id").eq("id", id).maybeSingle();
  if (!data || data.author_id !== viewer.id) return { error: fail("Submission not found.") } as const;
  if (data.status !== "draft") return { error: fail("This submission has already been sent.") } as const;
  return { viewer, supabase } as const;
}

/** Creates a draft. The idempotency key means a double click never makes two (item 14). */
export async function createDraft(form: FormData) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/submit");
  const flags = await getFlags();
  if (!flags.submissions_open) redirect("/submit");
  const limit = await rateLimit({ headers: await headers() }, RATE_LIMITS.submission, `submission:${viewer.id}`);
  if (!limit.allowed) redirect("/submit?limited=1");

  const parsed = z.string().min(8).max(100).safeParse(form.get("idempotencyKey"));
  if (!parsed.success) redirect("/submit");
  const key = parsed.data;
  const supabase = await userClient();
  const { data: existing } = await supabase.from("submissions").select("id").eq("idempotency_key", key).maybeSingle();
  if (existing) redirect(`/submit/${existing.id}`);

  const { data, error } = await supabase
    .from("submissions")
    .insert({ author_id: viewer.id, type: "research_article", idempotency_key: key || crypto.randomUUID() })
    .select("id")
    .single();
  if (error || !data) {
    logger.error({ err: error }, "create draft failed");
    redirect("/submit?error=1");
  }
  // Pre-fill the submitting author.
  await supabase.from("submission_authors").insert({
    submission_id: data.id,
    position: 1,
    name: viewer.fullName,
    affiliation: viewer.affiliation,
    email: viewer.email,
    orcid: viewer.orcid,
    is_corresponding: true,
  });
  redirect(`/submit/${data.id}`);
}

export type DetailsInput = {
  title: string;
  type: string;
  categoryId: string;
  abstract: string;
  keywords: string[];
  citationStyle: string;
};

/** Autosave: stores whatever is there; validation happens on "Continue" and on submit. */
export async function saveDetails(id: string, input: DetailsInput, validate = false): Promise<Result> {
  const own = await ownDraft(id);
  if ("error" in own) return own.error!;
  if (validate) {
    const parsed = detailsSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
      return fail("Please complete the highlighted fields.", fieldErrors);
    }
  }
  const { error } = await own.supabase
    .from("submissions")
    .update({
      title: input.title.slice(0, 300),
      type: ["research_article", "theoretical_paper", "critical_review", "book_review"].includes(input.type)
        ? input.type
        : "research_article",
      category_id: /^[0-9a-f-]{36}$/.test(input.categoryId) ? input.categoryId : null,
      abstract: input.abstract.slice(0, 6000),
      keywords: input.keywords.slice(0, 6).map((k) => k.slice(0, 60)),
      citation_style: input.citationStyle === "apa7" || input.citationStyle === "mla9" ? input.citationStyle : null,
    })
    .eq("id", id);
  return error ? fail("Couldn’t save. Check your connection and try again.") : { ok: true };
}

export type AuthorInput = { name: string; affiliation: string; email: string; orcid: string; isCorresponding: boolean };

/** Replaces the author list in order (drag order is the position). */
export async function saveAuthors(id: string, authors: AuthorInput[]): Promise<Result> {
  const own = await ownDraft(id);
  if ("error" in own) return own.error!;
  const parsed = authorsSchema.safeParse(authors);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".") || "authors"] ??= i.message;
    return fail(parsed.error.issues[0]?.message ?? "Check the authors.", fieldErrors);
  }
  const { error: delErr } = await own.supabase.from("submission_authors").delete().eq("submission_id", id);
  if (delErr) return fail("Couldn’t save the authors.");
  const { error } = await own.supabase.from("submission_authors").insert(
    parsed.data.map((a, i) => ({
      submission_id: id,
      position: i + 1,
      name: a.name,
      affiliation: a.affiliation || null,
      email: a.email,
      orcid: a.orcid || null,
      is_corresponding: a.isCorresponding,
    })),
  );
  return error ? fail("Couldn’t save the authors.") : { ok: true };
}

/**
 * Issues a signed upload URL so the browser uploads straight to Storage, never
 * through a Next.js function (items 41 and 90). Kind, type and size are checked
 * before the URL is issued and again when the file is registered.
 */
export async function requestUpload(
  id: string,
  kind: UploadKind,
  file: { name: string; size: number; type: string },
): Promise<{ ok: true; path: string; token: string } | { ok: false; message: string }> {
  if (!validArgs(z.tuple([Id, UploadKindSchema, UploadFile]), [id, kind, file])) return INVALID;
  const own = await ownDraft(id);
  if ("error" in own) return { ok: false, message: own.error!.message ?? "Not allowed." };
  const spec = FILE_KINDS[kind];
  if (!spec || kind === "revision") return { ok: false, message: "Unknown file type." };
  if (!(spec.types as readonly string[]).includes(file.type))
    return { ok: false, message: `${spec.label}: ${spec.hint}` };
  if (file.size <= 0 || file.size > MAX_FILE_BYTES) return { ok: false, message: "Files must be smaller than 20 MB." };

  const { data: last } = await own.supabase
    .from("submission_files")
    .select("version")
    .eq("submission_id", id)
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const path = `${id}/${kind}/v${version}-${safeFileName(file.name)}`;
  const { data, error } = await adminClient().storage.from("submissions").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "Couldn’t prepare the upload. Please try again." };
  await adminClient()
    .from("pending_uploads")
    .upsert({ storage_path: path, bucket: "submissions", owner_id: own.viewer.id });
  return { ok: true, path, token: data.token };
}

/** Records an uploaded file after checking that it really is in Storage. */
export async function registerUpload(
  id: string,
  kind: UploadKind,
  path: string,
  originalName: string,
): Promise<Result> {
  if (!validArgs(z.tuple([Id, UploadKindSchema, StoragePath, z.string().max(255)]), [id, kind, path, originalName]))
    return INVALID;
  const own = await ownDraft(id);
  if ("error" in own) return own.error!;
  if (!path.startsWith(`${id}/${kind}/v`)) return fail("Unexpected file path.");
  const admin = adminClient();
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await admin.storage.from("submissions").list(folder, { search: name });
  const obj = listed?.find((o) => o.name === name);
  const meta = obj?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!obj || !meta?.size) return fail("The upload didn’t finish. Please try again.");
  if (meta.size > MAX_FILE_BYTES || !(FILE_KINDS[kind].types as readonly string[]).includes(meta.mimetype ?? "")) {
    await admin.storage.from("submissions").remove([path]);
    return fail("That file type or size isn’t accepted.");
  }
  const version = Number(name.match(/^v(\d+)-/)?.[1] ?? 1);
  const { error } = await own.supabase.from("submission_files").insert({
    submission_id: id,
    kind,
    version,
    storage_path: path,
    original_name: originalName.slice(0, 200),
    mime_type: meta.mimetype,
    size_bytes: meta.size,
    uploaded_by: own.viewer.id,
  });
  if (error) return fail("Couldn’t record the file. Please try again.");
  await admin.from("pending_uploads").delete().eq("storage_path", path);
  return { ok: true };
}

export async function saveDeclarations(id: string, checked: string[]): Promise<Result> {
  if (!validArgs(z.tuple([Id, z.array(z.string().max(60)).max(20)]), [id, checked])) return INVALID;
  const own = await ownDraft(id);
  if ("error" in own) return own.error!;
  const keys: string[] = DECLARATIONS.map(([k]) => k);
  const declarations: Record<string, boolean> = Object.fromEntries(keys.map((k) => [k, checked.includes(k)]));
  declarations.all = keys.every((k) => declarations[k]);
  const { error } = await own.supabase.from("submissions").update({ declarations }).eq("id", id);
  return error ? fail("Couldn’t save.") : { ok: true };
}

/** Sends the draft. The database re-checks completeness and decides whether a fee is due. */
export async function submitDraft(id: string): Promise<Result & { status?: string }> {
  if (!validArgs(Id, id)) return INVALID;
  const viewer = await getViewer();
  if (!viewer) return fail("Your session has ended. Please sign in again.");
  const { data, error } = await (await userClient()).rpc("submit_submission", { p_submission: id });
  if (error) return fail(error.message);
  kickJobs();
  return { ok: true, status: (data as { status: string }).status };
}

/** Deletes an unsent draft and its files. */
export async function discardDraft(form: FormData) {
  if (!validArgs(z.object({ id: Id }), Object.fromEntries(form))) redirect("/submit");
  const id = String(form.get("id") ?? "");
  const own = await ownDraft(id);
  if ("error" in own) redirect("/submit");
  const admin = adminClient();
  const { data: files } = await admin.from("submission_files").select("storage_path").eq("submission_id", id);
  if (files?.length) await admin.storage.from("submissions").remove(files.map((f) => f.storage_path));
  await admin.from("submissions").delete().eq("id", id).eq("status", "draft");
  redirect("/submit");
}
