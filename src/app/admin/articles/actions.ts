"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CONTENT_EDITORS,
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
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";

/**
 * Articles and book reviews. Book-review editors reach only book reviews:
 * RLS refuses anything else, and these actions report that plainly.
 */

const done = (message: string, id?: string): ActionResult => {
  expire(TAGS.articles, TAGS.issues);
  return { ok: true, message, id };
};

const TYPES = Object.keys(ARTICLE_TYPE_LABEL) as [ArticleType, ...ArticleType[]];

async function uniqueSlug(db: SupabaseClient, base: string, exceptId?: string) {
  const root = base || "article";
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    let q = db.from("articles").select("id").eq("slug", slug);
    if (exceptId) q = q.neq("id", exceptId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function createArticle(form: FormData): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({ title: z.string().trim().min(3, "Add a title.").max(300), type: z.enum(TYPES) })
    .safeParse({ title: form.get("title"), type: form.get("type") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { title, type } = parsed.data;
  if (s.viewer.role === "book_review_editor" && type !== "book_review")
    return { ok: false, message: "Book-review editors can create book reviews only." };
  const slug = await uniqueSlug(s.db, slugify(title));
  const { data, error } = await s.db
    .from("articles")
    .insert({ title, type, slug, status: "draft" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: dbMessage(error, "Couldn’t create the article.") };
  if (type === "book_review")
    await s.db
      .from("book_reviews")
      .insert({ article_id: data.id, book_title: "[Book title]", book_author: "[Book author]" });
  return done(`${ARTICLE_TYPE_LABEL[type]} created as a draft.`, data.id);
}

const detailsSchema = z.object({
  id: z.uuid(),
  version: z.coerce.number().int(),
  title: z.string().trim().min(3, "Add a title.").max(300),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The URL slug may use lowercase letters, numbers and single hyphens."),
  type: z.enum(TYPES),
  category_id: z.union([z.uuid(), z.literal("")]),
  abstract: z.string().trim().max(5000),
  keywords: z.string().max(1000),
  first_page: z.union([z.coerce.number().int().positive(), z.literal("")]),
  last_page: z.union([z.coerce.number().int().positive(), z.literal("")]),
  doi: z.union([
    z
      .string()
      .trim()
      .regex(/^10\.\d{4,9}\/\S+$/, "A DOI looks like 10.12345/jhts.2027.001."),
    z.literal(""),
  ]),
  licence: z.string().trim().min(2).max(100),
  citation_style: z.enum(["apa7", "mla9", ""]),
  received_at: z.union([z.iso.date(), z.literal("")]),
  accepted_at: z.union([z.iso.date(), z.literal("")]),
});

export async function saveArticle(form: FormData): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const parsed = detailsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  if (d.first_page !== "" && d.last_page !== "" && d.last_page < d.first_page)
    return { ok: false, message: "The last page can’t come before the first page." };
  const r = await lockedUpdate(s.db, "articles", d.id, d.version, {
    title: d.title,
    slug: d.slug,
    type: d.type,
    category_id: d.category_id || null,
    abstract: d.abstract,
    keywords: d.keywords
      .split(/[,;]/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 12),
    first_page: d.first_page === "" ? null : d.first_page,
    last_page: d.last_page === "" ? null : d.last_page,
    doi: d.doi || null,
    licence: d.licence,
    citation_style: d.citation_style || null,
    received_at: d.received_at || null,
    accepted_at: d.accepted_at || null,
  });
  return r.ok ? { ...done("Article saved. Old links to a changed URL keep working."), version: r.version } : r;
}

export async function saveFullText(form: FormData): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const id = String(form.get("id") ?? "");
  const html = sanitize(String(form.get("body_html") ?? "")).trim();
  const r = await lockedUpdate(s.db, "articles", id, Number(form.get("version")), { body_html: html || null });
  return r.ok ? { ...done("Full text saved."), version: r.version } : r;
}

const authorSchema = z.object({
  name: z.string().trim().min(2, "Every author needs a name.").max(200),
  affiliation: z.string().trim().max(300),
  email: z.union([z.email("Check the author emails."), z.literal("")]),
  orcid: z.union([
    z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, "An ORCID iD looks like 0000-0002-1825-0097."),
    z.literal(""),
  ]),
  isCorresponding: z.boolean(),
  emailPublic: z.boolean(),
});
export type AuthorInput = z.infer<typeof authorSchema>;

/** Replace the author list in the given order. */
export async function saveAuthors(articleId: string, authors: AuthorInput[]): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const parsed = z.array(authorSchema).min(1, "Add at least one author.").max(30).safeParse(authors);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (parsed.data.filter((a) => a.isCorresponding).length > 1)
    return { ok: false, message: "Mark only one corresponding author." };
  const { error: delError } = await s.db.from("article_authors").delete().eq("article_id", articleId);
  if (delError) return { ok: false, message: dbMessage(delError) };
  const { error } = await s.db.from("article_authors").insert(
    parsed.data.map((a, i) => ({
      article_id: articleId,
      position: i + 1,
      name: a.name,
      affiliation: a.affiliation || null,
      email: a.email || null,
      orcid: a.orcid || null,
      is_corresponding: a.isCorresponding,
      email_public: a.emailPublic && !!a.email,
    })),
  );
  if (error) return { ok: false, message: dbMessage(error, "Couldn’t save the authors.") };
  return done("Authors saved.");
}

export async function saveBookDetails(form: FormData): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const parsed = z
    .object({
      article_id: z.uuid(),
      book_title: z.string().trim().min(1, "Add the book’s title.").max(300),
      book_author: z.string().trim().min(1, "Add the book’s author.").max(300),
      publisher: z.string().trim().max(200),
      year: z.union([z.coerce.number().int().min(1500).max(2100), z.literal("")]),
      isbn: z.union([
        z
          .string()
          .trim()
          .regex(/^[\d-]{10,17}X?$/i, "Check the ISBN."),
        z.literal(""),
      ]),
      pages: z.union([z.coerce.number().int().positive(), z.literal("")]),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;
  const { error } = await s.db.from("book_reviews").upsert({
    article_id: d.article_id,
    book_title: d.book_title,
    book_author: d.book_author,
    publisher: d.publisher || null,
    year: d.year === "" ? null : d.year,
    isbn: d.isbn || null,
    pages: d.pages === "" ? null : d.pages,
  });
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Book details saved.");
}

export async function publishArticle(id: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { data, error } = await s.db.rpc("publish_article", { p_article: id });
  if (error || !data) return { ok: false, message: dbMessage(error, "Couldn’t publish the article.") };
  const status = (data as { status: string }).status;
  return done(status === "published" ? "Published in its issue." : "Online now as an Article in Press.");
}

export async function unpublishArticle(id: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { error } = await s.db
    .from("articles")
    .update({ status: "unpublished", scheduled_for: null })
    .eq("id", id)
    .in("status", ["published", "in_press", "scheduled"]);
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Article unpublished. It is hidden from the public site.");
}

export async function scheduleArticle(form: FormData): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const id = String(form.get("id") ?? "");
  const when = Date.parse(`${form.get("at")}:00+01:00`);
  if (!Number.isFinite(when) || when < Date.now() + 60_000)
    return { ok: false, message: "Choose a date and time in the future (Lagos time)." };
  const { data: a } = await s.db.from("articles").select("pdf_path, body_html").eq("id", id).maybeSingle();
  if (!a) return { ok: false, message: "Article not found." };
  if (!a.pdf_path && !a.body_html) return { ok: false, message: "Add the PDF or the full text before scheduling." };
  const { error } = await s.db
    .from("articles")
    .update({ status: "scheduled", scheduled_for: new Date(when).toISOString() })
    .eq("id", id)
    .in("status", ["draft", "unpublished", "scheduled"]);
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Article scheduled. It will go online automatically.");
}

export async function unscheduleArticle(id: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { error } = await s.db
    .from("articles")
    .update({ status: "draft", scheduled_for: null })
    .eq("id", id)
    .eq("status", "scheduled");
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Schedule cancelled.");
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { error } = await s.db
    .from("articles")
    .update({ deleted_at: new Date().toISOString(), status: "unpublished" })
    .eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Article moved to the bin. Restore it from the articles list (filter: In the bin).");
}

export async function restoreArticle(id: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s) return denied;
  const { error } = await s.db.from("articles").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, message: dbMessage(error) };
  return done("Article restored as unpublished. Publish it again when ready.");
}
