"use server";

import { z } from "zod";
import {
  EDITORS,
  dbMessage,
  denied,
  expire,
  lockedUpdate,
  slugify,
  staff,
  type ActionResult,
} from "@/lib/admin/server";
import { TAGS } from "@/lib/data";
import { sanitize } from "@/lib/sanitize";
import { adminClient } from "@/lib/supabase/clients";
import { FEATURE_FLAG_DESCRIPTIONS } from "@/content/journal";
import { fields, Id, INVALID, validArgs } from "@/lib/validation";

/**
 * The journal's own content: categories, the Call for Papers, pages and
 * policies, the editorial board, the contact inbox and site settings.
 */

const ok = (message: string, tags: string[], id?: string): ActionResult => {
  expire(...tags);
  return { ok: true, message, id };
};
const slugRule = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The URL slug may use lowercase letters, numbers and single hyphens.");
const COLOUR = /^(--thread-[a-z]+|#[0-9a-f]{6})$/i;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategory(form: FormData): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      name: z.string().trim().min(2, "Name the category.").max(80),
      slug: z.union([slugRule, z.literal("")]),
      short_description: z.string().trim().max(200),
      description: z.string().trim().max(2000),
      thread_color: z.string().trim().regex(COLOUR, "Choose a thread colour or enter a hex value like #2d3561."),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, ...row } = parsed.data;
  row.slug ||= slugify(row.name);
  if (id) {
    const { error } = await s.db.from("categories").update(row).eq("id", id);
    if (error) return { ok: false, message: dbMessage(error) };
    return ok("Category saved.", [TAGS.categories, TAGS.articles]);
  }
  const { data: last } = await s.db
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await s.db.from("categories").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 });
  if (error) return { ok: false, message: dbMessage(error) };
  return ok("Category added.", [TAGS.categories]);
}

export async function archiveCategory(id: string, archived: boolean): Promise<ActionResult> {
  if (!validArgs(z.tuple([Id, z.boolean()]), [id, archived])) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { error } = await s.db.from("categories").update({ is_archived: archived }).eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };
  return ok(archived ? "Category archived. Its articles keep their subject." : "Category restored.", [
    TAGS.categories,
    TAGS.articles,
  ]);
}

export async function reorder(kind: "categories" | "board" | "pages", ids: string[]): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  if (!["categories", "board", "pages"].includes(kind) || !ids.every((i) => z.uuid().safeParse(i).success))
    return { ok: false, message: "Unexpected list." };
  const { error } = await s.db.rpc("reorder_rows", { p_kind: kind, p_ids: ids });
  if (error) return { ok: false, message: dbMessage(error) };
  return ok("Order saved.", [kind === "categories" ? TAGS.categories : kind === "board" ? TAGS.board : TAGS.pages]);
}

// ---------------------------------------------------------------------------
// Call for Papers
// ---------------------------------------------------------------------------

export async function saveCall(form: FormData): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      version: z.coerce.number().int().optional(),
      title: z.string().trim().min(3, "Give the call a title.").max(200),
      target_issue_id: z.union([z.uuid(), z.literal("")]),
      target_label: z.string().trim().min(3, "Say which issue the call is for.").max(120),
      summary_html: z.string().max(100_000),
      banner_text: z.string().trim().max(200),
      deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Set the submission deadline."),
      review_period: z.string().trim().max(120),
      publication_month: z.string().trim().max(60),
      is_active: z.literal("on").optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  const row = {
    title: d.title,
    target_issue_id: d.target_issue_id || null,
    target_label: d.target_label,
    summary_html: sanitize(d.summary_html),
    banner_text: d.banner_text,
    submission_deadline: new Date(`${d.deadline}:00+01:00`).toISOString(),
    review_period: d.review_period || null,
    publication_month: d.publication_month || null,
    is_active: d.is_active === "on",
  };
  // Only one call is active at a time: switch the others off first.
  if (row.is_active) {
    let q = s.db.from("call_for_papers").update({ is_active: false }).eq("is_active", true);
    if (d.id) q = q.neq("id", d.id);
    const { error } = await q;
    if (error) return { ok: false, message: dbMessage(error) };
  }
  if (d.id) {
    const r = await lockedUpdate(s.db, "call_for_papers", d.id, d.version ?? 0, row);
    return r.ok ? ok("Call for Papers saved.", [TAGS.cfp]) : r;
  }
  const { data, error } = await s.db.from("call_for_papers").insert(row).select("id").single();
  if (error) return { ok: false, message: dbMessage(error) };
  return ok("Call for Papers created.", [TAGS.cfp], data.id);
}

// ---------------------------------------------------------------------------
// Pages and policies (versioned: every save keeps the previous text)
// ---------------------------------------------------------------------------

export async function savePage(form: FormData): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({
      id: z.uuid(),
      version: z.coerce.number().int(),
      title: z.string().trim().min(2, "Add a title.").max(200),
      summary: z.string().trim().max(400),
      body_html: z.string().max(400_000),
      is_published: z.literal("on").optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  const r = await lockedUpdate(s.db, "pages", d.id, d.version, {
    title: d.title,
    summary: d.summary || null,
    body_html: sanitize(d.body_html),
    is_published: d.is_published === "on",
    updated_by: s.viewer.id,
  });
  return r.ok ? ok("Page saved. The previous version is kept in the history.", [TAGS.pages]) : r;
}

export async function restorePageVersion(pageId: string, versionId: string): Promise<ActionResult> {
  if (!validArgs(z.tuple([Id, Id]), [pageId, versionId])) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { data: v } = await s.db
    .from("page_versions")
    .select("title, body_html, version")
    .eq("id", versionId)
    .eq("page_id", pageId)
    .maybeSingle();
  if (!v) return { ok: false, message: "That version no longer exists." };
  const { error } = await s.db
    .from("pages")
    .update({ title: v.title, body_html: v.body_html, updated_by: s.viewer.id })
    .eq("id", pageId);
  if (error) return { ok: false, message: dbMessage(error) };
  return ok(`Version ${v.version} restored. The text it replaced is kept too.`, [TAGS.pages]);
}

export async function createPage(form: FormData): Promise<ActionResult> {
  if (!validArgs(z.object({ title: z.string().max(200), kind: z.enum(["page", "policy"]).optional() }), fields(form)))
    return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const title = String(form.get("title") ?? "").trim();
  const kind = form.get("kind") === "policy" ? "policy" : "page";
  if (title.length < 2) return { ok: false, message: "Add a title." };
  const { data, error } = await s.db
    .from("pages")
    .insert({ kind, title, slug: slugify(title), is_published: false, updated_by: s.viewer.id })
    .select("id")
    .single();
  if (error) return { ok: false, message: dbMessage(error) };
  return ok(`${kind === "policy" ? "Policy" : "Page"} created as unpublished.`, [TAGS.pages], data.id);
}

// ---------------------------------------------------------------------------
// Editorial board
// ---------------------------------------------------------------------------

const GROUPS = [
  "editor_in_chief",
  "assistant_editors",
  "associate_editors",
  "book_review_editors",
  "managing_editors",
  "journal_consultants",
] as const;

export async function saveBoardMember(form: FormData): Promise<ActionResult> {
  const s = await staff(EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({
      id: z.union([z.uuid(), z.literal("")]),
      version: z.coerce.number().int().optional(),
      group: z.enum(GROUPS),
      name: z.string().trim().min(2, "Add a name.").max(200),
      title: z.string().trim().max(120),
      affiliation: z.string().trim().max(300),
      orcid: z.union([
        z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "An ORCID iD looks like 0000-0002-1825-0097."),
        z.literal(""),
      ]),
      profile_url: z.union([z.url("Profile links must start with https://"), z.literal("")]),
      term_start: z.union([z.iso.date(), z.literal("")]),
      term_end: z.union([z.iso.date(), z.literal("")]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, version, ...d } = parsed.data;
  if (d.term_start && d.term_end && d.term_end <= d.term_start)
    return { ok: false, message: "The term must end after it starts." };
  const row = {
    group: d.group,
    name: d.name,
    title: d.title || null,
    affiliation: d.affiliation || null,
    orcid: d.orcid || null,
    profile_url: d.profile_url || null,
    term_start: d.term_start || null,
    term_end: d.term_end || null,
  };
  if (id) {
    const r = await lockedUpdate(s.db, "editorial_board_members", id, version ?? 0, row);
    return r.ok ? ok("Board member saved.", [TAGS.board]) : r;
  }
  const { data: last } = await s.db
    .from("editorial_board_members")
    .select("sort_order")
    .eq("group", d.group)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await s.db
    .from("editorial_board_members")
    .insert({ ...row, sort_order: (last?.sort_order ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, message: dbMessage(error) };
  return ok("Board member added.", [TAGS.board], data.id);
}

export async function removeBoardMember(id: string, restore = false): Promise<ActionResult> {
  if (!validArgs(z.tuple([Id, z.boolean()]), [id, restore])) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const { error } = await s.db
    .from("editorial_board_members")
    .update({ deleted_at: restore ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };
  return ok(restore ? "Board member restored." : "Removed from the board. You can restore them below the list.", [
    TAGS.board,
  ]);
}

// ---------------------------------------------------------------------------
// Contact inbox
// ---------------------------------------------------------------------------

export async function markMessage(
  id: string,
  change: "read" | "unread" | "archive" | "unarchive",
): Promise<ActionResult> {
  if (!validArgs(z.tuple([Id, z.enum(["read", "unread", "archive", "unarchive"])]), [id, change])) return INVALID;
  const s = await staff(EDITORS);
  if (!s) return denied;
  const patch =
    change === "read"
      ? { is_read: true }
      : change === "unread"
        ? { is_read: false }
        : { archived_at: change === "archive" ? new Date().toISOString() : null, is_read: true };
  const { error } = await s.db.from("contact_messages").update(patch).eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };
  return {
    ok: true,
    message: change === "archive" ? "Message archived." : change === "unarchive" ? "Back in the inbox." : "Updated.",
  };
}

// ---------------------------------------------------------------------------
// Settings and feature flags (Super Admin)
// ---------------------------------------------------------------------------

const naira = z.coerce.number().min(0).max(10_000_000);

export async function saveSettings(form: FormData): Promise<ActionResult> {
  const s = await staff(["super_admin"]);
  if (!s) return { ok: false, message: "Only a Super Admin can change settings." };
  const f = (k: string) => String(form.get(k) ?? "").trim();
  const issn = z.union([z.string().regex(/^\d{4}-\d{3}[\dX]$/i), z.literal("")]);
  const checks = z
    .object({
      journalName: z.string().min(3).max(200),
      shortName: z.string().min(2).max(20),
      contactEmail: z.union([z.email(), z.string().regex(/^\[.+\]$/)]),
      emailSender: z.string().min(5).max(200),
      issn,
      eissn: issn,
      doiPrefix: z.union([z.string().regex(/^10\.\d{4,9}$/), z.literal("")]),
      reviewNaira: naira,
      publicationNaira: naira,
    })
    .safeParse({
      journalName: f("journalName"),
      shortName: f("shortName"),
      contactEmail: f("contactEmail"),
      emailSender: f("emailSender"),
      issn: f("issn"),
      eissn: f("eissn"),
      doiPrefix: f("doiPrefix"),
      reviewNaira: f("reviewNaira"),
      publicationNaira: f("publicationNaira"),
    });
  if (!checks.success) {
    const field = String(checks.error.issues[0].path[0]);
    const hint: Record<string, string> = {
      issn: "An ISSN looks like 1234-567X.",
      eissn: "An ISSN looks like 1234-567X.",
      doiPrefix: "A DOI prefix looks like 10.12345.",
      contactEmail: "Enter the office email address.",
      reviewNaira: "Fees are amounts in naira.",
      publicationNaira: "Fees are amounts in naira.",
    };
    return { ok: false, message: hint[field] ?? `Check “${field}”.` };
  }
  const v = checks.data;
  const social = f("social")
    .split("\n")
    .map((line) => line.split("|").map((p) => p.trim()))
    .filter(([label, url]) => label && /^https:\/\//.test(url ?? ""))
    .map(([label, url]) => ({ label, url }));
  const values: Record<string, unknown> = {
    journalName: v.journalName,
    shortName: v.shortName,
    tagline: f("tagline"),
    publisher: f("publisher"),
    publisherShort: f("publisherShort"),
    frequency: f("frequency"),
    contactEmail: v.contactEmail,
    postalAddress: f("postalAddress"),
    officeHours: f("officeHours"),
    issn: v.issn || null,
    eissn: v.eissn || null,
    doiPrefix: v.doiPrefix || null,
    emailSender: v.emailSender,
    fees: {
      enabled: form.get("feesEnabled") === "on",
      reviewKobo: Math.round(v.reviewNaira * 100),
      publicationKobo: Math.round(v.publicationNaira * 100),
      covers: f("feesCovers"),
    },
    showBoardTerms: form.get("showBoardTerms") === "on",
    social,
    seo: { description: f("seoDescription").slice(0, 300) },
  };
  // A cleared field (ISSN, DOI prefix…) removes its row: the built-in default
  // (none) applies, and the value column never holds SQL NULL.
  const entries = Object.entries(values);
  const { error } = await s.db
    .from("site_settings")
    .upsert(
      entries
        .filter(([, value]) => value !== null)
        .map(([key, value]) => ({ key, value, is_public: true, updated_by: s.viewer.id })),
    );
  if (error) return { ok: false, message: dbMessage(error) };
  const cleared = entries.filter(([, value]) => value === null).map(([key]) => key);
  if (cleared.length) {
    const { error: delError } = await s.db.from("site_settings").delete().in("key", cleared);
    if (delError) return { ok: false, message: dbMessage(delError) };
  }
  return ok("Settings saved.", [TAGS.settings]);
}

export async function setFlag(key: string, enabled: boolean): Promise<ActionResult> {
  if (!validArgs(z.tuple([z.string().max(60), z.boolean()]), [key, enabled])) return INVALID;
  const s = await staff(["super_admin"]);
  if (!s) return { ok: false, message: "Only a Super Admin can change feature flags." };
  if (!(key in FEATURE_FLAG_DESCRIPTIONS)) return { ok: false, message: "Unknown flag." };
  const { error } = await s.db.from("feature_flags").upsert({
    key,
    enabled,
    description: FEATURE_FLAG_DESCRIPTIONS[key as keyof typeof FEATURE_FLAG_DESCRIPTIONS],
    updated_by: s.viewer.id,
  });
  if (error) return { ok: false, message: dbMessage(error) };
  return ok(
    `${enabled ? "Turned on" : "Turned off"}: ${FEATURE_FLAG_DESCRIPTIONS[key as keyof typeof FEATURE_FLAG_DESCRIPTIONS]}.`,
    [TAGS.flags],
  );
}

/** For the settings page: the database schema version and health, read with the service role. */
export async function systemInfo() {
  const s = await staff(["super_admin"]);
  if (!s) return null;
  const db = adminClient();
  const [{ data: version }, { data: health }] = await Promise.all([db.rpc("schema_version"), db.rpc("health_check")]);
  return { version: version as string | null, health: health as Record<string, unknown> | null };
}
