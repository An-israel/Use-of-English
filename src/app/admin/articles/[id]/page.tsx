import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AssetUpload } from "@/components/admin/AssetUpload";
import { RowVersion } from "@/components/admin/RowVersion";
import { StatusPill } from "@/components/admin/StatusPill";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { formatDate, isoDateFromNow } from "@/lib/format";
import { issueLabel } from "@/lib/issues";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { deleteArticle, publishArticle, restoreArticle, unpublishArticle, unscheduleArticle } from "../actions";
import {
  ArticleDetailsForm,
  AuthorsEditor,
  BookDetailsForm,
  FullTextForm,
  IssuePicker,
  ScheduleArticleForm,
} from "./Editors";

export const metadata = { title: "Article" };

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(["super_admin", "editor", "book_review_editor"], "/admin/articles");
  const { id } = await params;
  const db = await userClient();
  const { data: a } = await db
    .from("articles")
    .select(
      "id, issue_id, category_id, type, title, slug, abstract, keywords, body_html, first_page, last_page, doi, citation_style, licence, pdf_path, docx_path, received_at, accepted_at, online_at, published_at, scheduled_for, status, submission_id, is_sample, version, deleted_at, view_count, download_count, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();
  const [authors, emails, bookRes, issues, versions, sub, categories] = await Promise.all([
    db
      .from("article_authors")
      .select("id, position, name, affiliation, orcid, is_corresponding, email_public")
      .eq("article_id", id)
      .order("position"),
    db.rpc("article_author_emails", { p_article: id }),
    a.type === "book_review"
      ? db.from("book_reviews").select("*").eq("article_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("issues")
      .select("id, number, month, status, volume:volumes ( number, year )")
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: true }),
    db
      .from("file_versions")
      .select("id, slot, storage_path, replaced_at")
      .in("entity", ["article", "book_review"])
      .eq("entity_id", id)
      .order("replaced_at", { ascending: false })
      .limit(12),
    a.submission_id
      ? db.from("submissions").select("id, public_id").eq("id", a.submission_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getCategories(),
  ]);
  const emailById = new Map(
    ((emails.data ?? []) as { author_id: string; email: string }[]).map((e) => [e.author_id, e.email]),
  );
  const issueOptions = (issues.data ?? []).map((i) => {
    const v = i.volume as unknown as { number: number; year: number };
    return {
      value: i.id,
      label: `${issueLabel({ volume: v.number, number: i.number, month: i.month, year: v.year })}${i.status === "published" ? "" : ` (${i.status})`}`,
    };
  });
  const issueName = issueOptions.find((o) => o.value === a.issue_id)?.label;
  const live = a.status === "published" || a.status === "in_press";
  const listHref = a.type === "book_review" ? "/admin/book-reviews" : "/admin/articles";
  const book = bookRes.data as Record<string, string | number | null> | null;

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { href: "/admin", label: "Admin" },
          { href: listHref, label: a.type === "book_review" ? "Book reviews" : "Articles" },
        ]}
        title={a.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={a.deleted_at ? "deleted" : a.status} />
            {ARTICLE_TYPE_LABEL[a.type as ArticleType]}
            {issueName ? ` · ${issueName}` : a.status === "in_press" ? " · Article in Press" : ""}
            {a.is_sample && <span className="text-accent text-[0.75rem]">SAMPLE</span>}
            {sub.data && (
              <>
                {" · from "}
                <Link href={`/admin/submissions/${sub.data.id}`} className="underline underline-offset-4">
                  {sub.data.public_id}
                </Link>
              </>
            )}
          </span>
        }
        actions={
          a.deleted_at ? (
            <ActionButton variant="primary" run={restoreArticle.bind(null, a.id)}>
              Restore from the bin
            </ActionButton>
          ) : (
            <>
              {live ? (
                <Link href={`/articles/${a.slug}`} target="_blank" className="btn-line">
                  View on site ↗
                </Link>
              ) : (
                <Link href={`/admin/articles/${a.id}/preview`} className="btn-line">
                  Preview
                </Link>
              )}
              {live ? (
                <ActionButton
                  run={unpublishArticle.bind(null, a.id)}
                  confirm={{
                    title: "Unpublish this article?",
                    description: "It disappears from the site, search and the issue until you publish it again.",
                    confirmLabel: "Unpublish",
                    tone: "danger",
                  }}
                >
                  Unpublish
                </ActionButton>
              ) : (
                <ActionButton
                  variant="primary"
                  run={publishArticle.bind(null, a.id)}
                  confirm={{
                    title: "Publish this article?",
                    description: a.issue_id
                      ? "If its issue is out it appears there now; otherwise it goes online as an Article in Press and joins the issue when that is published."
                      : "It goes online now as an Article in Press. You can move it into an issue later.",
                    confirmLabel: "Publish",
                  }}
                >
                  Publish
                </ActionButton>
              )}
            </>
          )
        }
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <RowVersion version={a.version}>
          <div className="col-span-12 space-y-6 xl:col-span-8">
            <section className="admin-box" aria-labelledby="d">
              <h2 id="d" className="font-display mb-4 text-[1.15rem]">
                Details
              </h2>
              <ArticleDetailsForm
                bookOnly={viewer.role === "book_review_editor"}
                categories={categories.map((c) => ({ value: c.id, label: c.name }))}
                values={{
                  id: a.id,
                  version: a.version,
                  title: a.title,
                  slug: a.slug,
                  type: a.type,
                  category_id: a.category_id ?? "",
                  abstract: a.abstract,
                  keywords: (a.keywords as string[]).join(", "),
                  first_page: a.first_page?.toString() ?? "",
                  last_page: a.last_page?.toString() ?? "",
                  doi: a.doi ?? "",
                  licence: a.licence,
                  citation_style: a.citation_style ?? "",
                  received_at: a.received_at ?? "",
                  accepted_at: a.accepted_at ?? "",
                }}
              />
            </section>
            <section className="admin-box" aria-labelledby="au">
              <h2 id="au" className="font-display mb-4 text-[1.15rem]">
                Authors
              </h2>
              <AuthorsEditor
                // Re-mount only when the saved author list changes, never on other saves.
                key={(authors.data ?? []).map((x) => x.id).join()}
                articleId={a.id}
                initial={(authors.data ?? []).map((x) => ({
                  name: x.name,
                  affiliation: x.affiliation ?? "",
                  email: emailById.get(x.id) ?? "",
                  orcid: x.orcid ?? "",
                  isCorresponding: x.is_corresponding,
                  emailPublic: x.email_public,
                }))}
              />
            </section>
            {a.type === "book_review" && (
              <section className="admin-box" aria-labelledby="bk">
                <h2 id="bk" className="font-display mb-4 text-[1.15rem]">
                  The book under review
                </h2>
                <BookDetailsForm
                  articleId={a.id}
                  values={{
                    book_title: String(book?.book_title ?? ""),
                    book_author: String(book?.book_author ?? ""),
                    publisher: String(book?.publisher ?? ""),
                    year: book?.year ? String(book.year) : "",
                    isbn: String(book?.isbn ?? ""),
                    pages: book?.pages ? String(book.pages) : "",
                  }}
                />
                <div className="mt-5">
                  <AssetUpload
                    slot="book_review:book_cover"
                    id={a.id}
                    current={(book?.book_cover_path as string | null) ?? null}
                    preview
                    clearLabel="Remove cover"
                  />
                </div>
              </section>
            )}
            <section className="admin-box" aria-labelledby="ft">
              <h2 id="ft" className="font-display mb-1 text-[1.15rem]">
                Full text
              </h2>
              <p className="text-muted mb-4 text-[0.86rem]">
                Shown as the HTML reading view on the article page. Optional when a PDF is attached.
              </p>
              <FullTextForm id={a.id} version={a.version} html={a.body_html ?? ""} />
            </section>
          </div>
        </RowVersion>
        <aside className="col-span-12 space-y-6 xl:col-span-4">
          <section className="admin-box space-y-4" aria-labelledby="pl">
            <h2 id="pl" className="font-display text-[1.15rem]">
              Placement
            </h2>
            <IssuePicker articleId={a.id} current={a.issue_id ?? ""} issues={issueOptions} />
            <dl className="text-muted grid grid-cols-2 gap-y-1 text-[0.84rem]">
              <dt>Online</dt>
              <dd className="tabular">{formatDate(a.online_at) || "—"}</dd>
              <dt>In issue</dt>
              <dd className="tabular">{formatDate(a.published_at) || "—"}</dd>
              <dt>Views · downloads</dt>
              <dd className="tabular">
                {a.view_count} · {a.download_count}
              </dd>
            </dl>
          </section>
          <section className="admin-box space-y-3" aria-labelledby="fl">
            <h2 id="fl" className="font-display text-[1.15rem]">
              Files
            </h2>
            <AssetUpload slot="article:pdf" id={a.id} current={a.pdf_path} />
            <AssetUpload slot="article:docx" id={a.id} current={a.docx_path} />
            {!!versions.data?.length && (
              <details className="text-[0.84rem]">
                <summary className="text-muted cursor-pointer">Previous versions ({versions.data.length})</summary>
                <ul className="mt-2 space-y-1">
                  {versions.data.map((v) => (
                    <li key={v.id} className="text-muted">
                      {v.slot.replace("_", " ")} · {v.storage_path.split("/").pop()} · replaced{" "}
                      {formatDate(v.replaced_at)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
          {!live && !a.deleted_at && (
            <section className="admin-box space-y-3" aria-labelledby="sc">
              <h2 id="sc" className="font-display text-[1.15rem]">
                Schedule
              </h2>
              {a.status === "scheduled" ? (
                <div className="space-y-3 text-[0.9rem]">
                  <p>Goes online on {formatDate(a.scheduled_for)}.</p>
                  <ActionButton run={unscheduleArticle.bind(null, a.id)}>Cancel the schedule</ActionButton>
                </div>
              ) : (
                <ScheduleArticleForm id={a.id} defaultAt={`${isoDateFromNow(1)}T09:00`} />
              )}
            </section>
          )}
          {!a.deleted_at && (
            <ActionButton
              variant="quiet"
              run={deleteArticle.bind(null, a.id)}
              redirectTo={listHref}
              confirm={{
                title: "Move this article to the bin?",
                description: "It is unpublished and hidden everywhere. You can restore it from the list (In the bin).",
                confirmLabel: "Move to bin",
                tone: "danger",
              }}
            >
              Move to the bin
            </ActionButton>
          )}
        </aside>
      </div>
    </>
  );
}
