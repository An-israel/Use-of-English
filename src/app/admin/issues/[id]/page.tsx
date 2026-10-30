import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AssetUpload } from "@/components/admin/AssetUpload";
import { StatusPill } from "@/components/admin/StatusPill";
import { IssueCover } from "@/components/weave/IssueCover";
import { requireRole } from "@/lib/auth";
import { formatDate, isoDateFromNow } from "@/lib/format";
import { issueLabel, issuePath, pageRange } from "@/lib/issues";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { getSettings } from "@/lib/data";
import { assignDois, deleteIssue, publishIssue, unpublishIssue, unscheduleIssue } from "../actions";
import { BulkPdfUpload } from "./BulkPdfUpload";
import { IssueArticles, IssueDetailsForm, ScheduleForm } from "./Editors";

export const metadata = { title: "Issue" };

export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["super_admin", "editor"], "/admin/issues");
  const { id } = await params;
  const db = await userClient();
  const { data: i } = await db
    .from("issues")
    .select(
      "id, number, month, title, editorial, cover_path, full_pdf_path, full_docx_path, status, scheduled_for, published_at, deleted_at, version, volume:volumes ( number, year )",
    )
    .eq("id", id)
    .maybeSingle();
  if (!i) notFound();
  const volume = i.volume as unknown as { number: number; year: number };
  const [{ data: articles }, { data: candidates }, { data: versions }] = await Promise.all([
    db
      .from("articles")
      .select("id, title, slug, status, type, first_page, last_page, doi, pdf_path")
      .eq("issue_id", id)
      .is("deleted_at", null)
      .order("sort_order"),
    db
      .from("articles")
      .select("id, title, status")
      .is("issue_id", null)
      .is("deleted_at", null)
      .in("status", ["in_press", "draft", "scheduled"])
      .order("title"),
    db
      .from("file_versions")
      .select("id, slot, storage_path, replaced_at")
      .eq("entity", "issue")
      .eq("entity_id", id)
      .order("replaced_at", { ascending: false })
      .limit(10),
  ]);
  const ref = { volume: volume.number, number: i.number, month: i.month, year: volume.year };
  const label = issueLabel(ref);
  const coverUrl = i.cover_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${i.cover_path}`
    : null;
  const published = i.status === "published";
  const doiPrefix = (await getSettings()).doiPrefix;
  const missingDois = (articles ?? []).filter((a) => !a.doi).length;

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/issues", label: "Issues" },
        ]}
        title={label}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={i.deleted_at ? "deleted" : i.status} />
            {published && <>Published {formatDate(i.published_at)}</>}
            {i.status === "scheduled" && <>Publishes automatically on {formatDate(i.scheduled_for)}</>}
          </span>
        }
        actions={
          <>
            {published ? (
              <Link href={issuePath(ref)} className="btn-line" target="_blank">
                View on site ↗
              </Link>
            ) : (
              <Link href={`/admin/issues/${i.id}/preview`} className="btn-line">
                Preview
              </Link>
            )}
            {published ? (
              <ActionButton
                variant="line"
                run={unpublishIssue.bind(null, i.id)}
                confirm={{
                  title: `Unpublish ${label}?`,
                  description:
                    "The issue and all its articles disappear from the public site until you publish again. Links will stop working.",
                  confirmLabel: "Unpublish",
                  tone: "danger",
                }}
              >
                Unpublish
              </ActionButton>
            ) : (
              <ActionButton
                variant="primary"
                run={publishIssue.bind(null, i.id)}
                confirm={{
                  title: `Publish ${label} now?`,
                  description: `The issue and its ${articles?.length ?? 0} article(s) go live immediately and readers can cite them.`,
                  confirmLabel: "Publish now",
                }}
              >
                Publish now
              </ActionButton>
            )}
          </>
        }
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <section className="admin-box" aria-labelledby="toc">
            <h2 id="toc" className="font-display mb-4 text-[1.15rem]">
              Contents
            </h2>
            <IssueArticles
              issueId={i.id}
              rows={(articles ?? []).map((a) => ({
                id: a.id,
                title: a.title,
                status: a.status,
                type: ARTICLE_TYPE_LABEL[a.type as ArticleType],
                pages: pageRange(a.first_page, a.last_page),
              }))}
              candidates={candidates ?? []}
            />
          </section>
          {!!articles?.length && (
            <section className="admin-box" aria-labelledby="bulk">
              <h2 id="bulk" className="font-display mb-1 text-[1.15rem]">
                Article PDFs
              </h2>
              <p className="text-muted mb-4 text-[0.86rem]">
                {articles.filter((a) => a.pdf_path).length} of {articles.length} articles have a PDF. Upload several at
                once; replaced files are kept.
              </p>
              <BulkPdfUpload
                articles={articles.map((a) => ({
                  id: a.id,
                  slug: a.slug,
                  title: a.title,
                  hasPdf: Boolean(a.pdf_path),
                }))}
              />
            </section>
          )}
          <section className="admin-box" aria-labelledby="details">
            <h2 id="details" className="font-display mb-4 text-[1.15rem]">
              Details and editorial
            </h2>
            <IssueDetailsForm
              id={i.id}
              version={i.version}
              title={i.title ?? ""}
              month={i.month}
              editorial={i.editorial ?? ""}
            />
          </section>
        </div>
        <aside className="col-span-12 space-y-6 xl:col-span-4">
          <section className="admin-box space-y-4" aria-labelledby="cover">
            <h2 id="cover" className="font-display text-[1.15rem]">
              Cover
            </h2>
            <div className="mx-auto w-44">
              <IssueCover {...ref} issue={i.number} coverUrl={coverUrl} sizes="176px" />
            </div>
            <p className="text-muted text-center text-[0.8rem]">
              {coverUrl ? "Uploaded cover" : "Generated cover (Akwete weave). Upload an image to replace it."}
            </p>
            <AssetUpload slot="issue:cover" id={i.id} current={i.cover_path} clearLabel="Use the generated cover" />
          </section>
          <section className="admin-box space-y-3" aria-labelledby="files">
            <h2 id="files" className="font-display text-[1.15rem]">
              Full-issue files
            </h2>
            <AssetUpload slot="issue:full_pdf" id={i.id} current={i.full_pdf_path} />
            <AssetUpload slot="issue:full_docx" id={i.id} current={i.full_docx_path} />
            {!!versions?.length && (
              <details className="text-[0.84rem]">
                <summary className="text-muted cursor-pointer">Previous files ({versions.length})</summary>
                <ul className="mt-2 space-y-1">
                  {versions.map((v) => (
                    <li key={v.id} className="text-muted">
                      {v.slot.replace("_", " ")} · {v.storage_path.split("/").pop()} · replaced{" "}
                      {formatDate(v.replaced_at)}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
          <section className="admin-box space-y-3" aria-labelledby="xref">
            <h2 id="xref" className="font-display text-[1.15rem]">
              DOIs and Crossref
            </h2>
            {!doiPrefix ? (
              <p className="text-muted text-[0.86rem]">
                Set the DOI prefix in{" "}
                <Link href="/admin/settings" className="underline underline-offset-4">
                  Settings
                </Link>{" "}
                once JHTS joins Crossref; DOIs and the deposit file are then generated here.
              </p>
            ) : (
              <>
                <p className="text-muted text-[0.86rem]">
                  {missingDois
                    ? `${missingDois} of ${articles?.length ?? 0} articles have no DOI yet.`
                    : "Every article has a DOI."}{" "}
                  The deposit file is for manual upload to Crossref; nothing is sent automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingDois > 0 && (
                    <ActionButton
                      run={assignDois.bind(null, i.id)}
                      confirm={{
                        title: "Assign DOIs?",
                        description: `Articles without a DOI get one under ${doiPrefix}, following the issue’s contents order. DOIs are permanent once deposited.`,
                        confirmLabel: "Assign DOIs",
                      }}
                    >
                      Assign DOIs
                    </ActionButton>
                  )}
                  <a href={`/api/admin/crossref/${i.id}`} className="btn-line" download>
                    Crossref XML
                  </a>
                </div>
              </>
            )}
          </section>
          {!published && (
            <section className="admin-box space-y-4" aria-labelledby="sched">
              <h2 id="sched" className="font-display text-[1.15rem]">
                Schedule
              </h2>
              {i.status === "scheduled" ? (
                <div className="space-y-3 text-[0.9rem]">
                  <p>Publishes on {formatDate(i.scheduled_for)}.</p>
                  <ActionButton run={unscheduleIssue.bind(null, i.id)}>Cancel the schedule</ActionButton>
                </div>
              ) : (
                <ScheduleForm id={i.id} defaultAt={`${isoDateFromNow(7)}T09:00`} />
              )}
            </section>
          )}
          {!published && !i.deleted_at && (
            <ActionButton
              variant="quiet"
              run={deleteIssue.bind(null, i.id)}
              redirectTo="/admin/issues"
              confirm={{
                title: "Move this issue to the bin?",
                description: "Only empty, unpublished issues can be removed. You can restore it from the issues list.",
                confirmLabel: "Move to bin",
                tone: "danger",
              }}
            >
              Move issue to the bin
            </ActionButton>
          )}
        </aside>
      </div>
    </>
  );
}
