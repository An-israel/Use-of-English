"use server";

import { z } from "zod";
import {
  CONTENT_EDITORS,
  EDITORS,
  dbMessage,
  denied,
  expire,
  lockedUpdate,
  staff,
  type ActionResult,
} from "@/lib/admin/server";
import { TAGS } from "@/lib/data";
import { withDbRetry } from "@/lib/resilience";
import { sanitize } from "@/lib/sanitize";
import { fields, Id, INVALID, validArgs } from "@/lib/validation";

/**
 * Issues: create the next quarterly issue, edit the editorial, order the
 * articles, publish, schedule and unpublish. Publishing itself happens in the
 * database (publish_issue) under an advisory lock.
 */

const done = (message: string, id?: string): ActionResult => {
  expire(TAGS.issues, TAGS.articles);
  return { ok: true, message, id };
};

export async function createNextIssue(year?: number): Promise<ActionResult> {
  if (!validArgs(z.number().int().min(2026).max(2200).optional(), year)) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { data, error } = await s.db.rpc("create_next_issue", { p_year: year ?? null });
  if (error || !data) return { ok: false, message: dbMessage(error, "Couldn’t create the issue.") };
  const issue = data as { id: string; number: number };
  return { ok: true, message: `Issue ${issue.number} created as a draft.`, id: issue.id };
}

export async function createVolumeYear(form: FormData): Promise<ActionResult> {
  if (!validArgs(z.object({ year: z.coerce.number().int().min(2026).max(2200) }), fields(form)))
    return { ok: false, message: "Enter a year such as 2028." };
  const year = Number(form.get("year"));
  if (!Number.isInteger(year) || year < 2026 || year > 2200)
    return { ok: false, message: "Enter a year such as 2028." };
  return createNextIssue(year);
}

export async function saveIssue(form: FormData): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({
      id: z.uuid(),
      version: z.coerce.number().int(),
      title: z.string().trim().max(200),
      month: z.coerce.number().int().min(1).max(12),
      editorial: z.string().max(200_000),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Check the month and title." };
  const { id, version, title, month, editorial } = parsed.data;
  const r = await lockedUpdate(s.db, "issues", id, version, {
    title: title || null,
    month,
    editorial: sanitize(editorial) || null,
  });
  return r.ok ? done("Issue saved.") : r;
}

export async function publishIssue(id: string): Promise<ActionResult> {
  if (!validArgs(Id, id)) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { error } = await withDbRetry(() => s.db.rpc("publish_issue", { p_issue: id }));
  if (error) return { ok: false, message: dbMessage(error, "Couldn’t publish the issue.") };
  return done("Issue published. Its articles are live.");
}

export async function unpublishIssue(id: string): Promise<ActionResult> {
  if (!validArgs(Id, id)) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { error } = await s.db.rpc("unpublish_issue", { p_issue: id });
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Issue unpublished. It and its articles are hidden from the public.");
}

export async function scheduleIssue(form: FormData): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  const id = String(form.get("id") ?? "");
  const when = Date.parse(`${form.get("at")}:00+01:00`);
  if (!Number.isFinite(when) || when < Date.now() + 60_000)
    return { ok: false, message: "Choose a date and time in the future (Lagos time)." };
  const { error } = await s.db
    .from("issues")
    .update({ status: "scheduled", scheduled_for: new Date(when).toISOString() })
    .eq("id", id)
    .neq("status", "published");
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Issue scheduled. It will publish automatically.");
}

export async function unscheduleIssue(id: string): Promise<ActionResult> {
  if (!validArgs(Id, id)) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { error } = await s.db
    .from("issues")
    .update({ status: "draft", scheduled_for: null })
    .eq("id", id)
    .eq("status", "scheduled");
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Schedule cancelled; the issue is a draft again.");
}

export async function deleteIssue(id: string): Promise<ActionResult> {
  if (!validArgs(Id, id)) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { count } = await s.db
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("issue_id", id)
    .is("deleted_at", null);
  if (count) return { ok: false, message: "Move or remove this issue’s articles first." };
  const { error } = await s.db
    .from("issues")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "published");
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Issue moved to the bin. You can restore it from the issues list.");
}

export async function restoreIssue(id: string): Promise<ActionResult> {
  if (!validArgs(Id, id)) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { error } = await s.db.from("issues").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Issue restored.");
}

/** Put the issue's articles in this order (table of contents). */
export async function reorderArticles(ids: string[]): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  if (!ids.every((id) => z.uuid().safeParse(id).success)) return { ok: false, message: "Unexpected list." };
  const { error } = await s.db.rpc("reorder_rows", { p_kind: "articles", p_ids: ids });
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Order saved.");
}

/**
 * Assign an article to an issue (or take it out, with issueId null). Into a
 * published issue it is published with it; otherwise an online Article in
 * Press stays online until the issue appears.
 */
export async function assignToIssue(articleId: string, issueId: string | null): Promise<ActionResult> {
  if (!validArgs(z.tuple([Id, Id.nullable()]), [articleId, issueId])) return INVALID;
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { data: a } = await s.db.from("articles").select("status").eq("id", articleId).maybeSingle();
  if (!a) return { ok: false, message: "Article not found." };
  const patch: Record<string, unknown> = { issue_id: issueId };
  if (issueId) {
    const { data: issue } = await s.db.from("issues").select("status").eq("id", issueId).maybeSingle();
    if (!issue) return { ok: false, message: "Issue not found." };
    const { data: last } = await s.db
      .from("articles")
      .select("sort_order")
      .eq("issue_id", issueId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    patch.sort_order = (last?.sort_order ?? 0) + 1;
    if (issue.status === "published" && a.status === "in_press") {
      patch.status = "published";
      patch.published_at = new Date().toISOString();
    }
  } else if (a.status === "published") {
    // Leaving a published issue: it stays online as an Article in Press.
    patch.status = "in_press";
    patch.published_at = null;
  }
  const { error } = await s.db.from("articles").update(patch).eq("id", articleId);
  if (error) return { ok: false, message: dbMessage(error) };
  return done(issueId ? "Article added to the issue." : "Article removed from the issue.");
}

/** Give every article in the issue without a DOI the suggested one (Settings → DOI prefix). */
export async function assignDois(issueId: string): Promise<ActionResult> {
  if (!validArgs(Id, issueId)) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { getSettings } = await import("@/lib/data");
  const { suggestDoi } = await import("@/lib/crossref");
  const prefix = (await getSettings()).doiPrefix;
  if (!prefix) return { ok: false, message: "Set the DOI prefix in Settings first." };
  const { data: issue } = await s.db
    .from("issues")
    .select("number, volume:volumes ( number, year )")
    .eq("id", issueId)
    .maybeSingle();
  if (!issue) return { ok: false, message: "Issue not found." };
  const v = issue.volume as unknown as { number: number; year: number };
  const { data: articles } = await s.db
    .from("articles")
    .select("id, doi")
    .eq("issue_id", issueId)
    .is("deleted_at", null)
    .order("sort_order");
  let n = 0;
  for (const [i, a] of (articles ?? []).entries()) {
    if (a.doi) continue;
    const { error } = await s.db
      .from("articles")
      .update({ doi: suggestDoi(prefix, v.year, v.number, issue.number, i + 1) })
      .eq("id", a.id);
    if (error) return { ok: false, message: dbMessage(error, "A DOI couldn’t be assigned (is it already used?).") };
    n++;
  }
  return done(
    n
      ? `${n} DOI${n === 1 ? "" : "s"} assigned. Deposit them with Crossref to make them resolve.`
      : "Every article already has a DOI.",
  );
}
