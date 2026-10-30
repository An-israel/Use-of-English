import Link from "next/link";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { getFlags, getSettings } from "@/lib/data";
import { formatDate, formatNaira, isPast, isoDateFromNow } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { RECOMMENDATION_LABEL, REVIEW_STATUS_LABEL, type Recommendation } from "@/lib/submission";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { STATUS_LABEL, editorTransitions, type SubmissionStatus } from "@/lib/workflow";
import { cancelReview, createArticleFromSubmission, extendReview, shareReviewComments } from "../review-actions";
import { NoteControl, StatusControl, WaiveControl } from "./Controls";
import { EditorialDetails, InviteReviewer, StaffUpload, type ReviewerOption } from "./Panels";

export const metadata = { title: "Submission" };

type Review = {
  id: string;
  reviewer_id: string;
  round: number;
  status: keyof typeof REVIEW_STATUS_LABEL;
  due_at: string;
  invited_at: string;
  responded_at: string | null;
  recommendation: Recommendation | null;
  comments_to_author: string | null;
  comments_to_editor: string | null;
  submitted_at: string | null;
  reviewer: { full_name: string; email: string } | null;
};

const FILE_LABEL: Record<string, string> = {
  manuscript: "Manuscript",
  title_page: "Title page",
  cover_letter: "Cover letter",
  revision: "Revised manuscript",
  plagiarism_report: "Plagiarism report",
  reviewer_comments: "Reviewer comments (shared)",
  review_report: "Review report",
};

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(
    ["super_admin", "editor", "book_review_editor", "finance_officer"],
    "/admin/submissions",
  );
  const { id } = await params;
  const db = await userClient();
  const { data: s } = await db
    .from("submissions")
    .select(
      "id, public_id, title, type, status, abstract, keywords, citation_style, similarity_percent, submitted_at, received_at, accepted_at, handling_editor_id, article_id, version, rejection_reason, category:categories ( name )",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const [authors, files, events, payments, reviews, pool, editors, settings, flags] = await Promise.all([
    db
      .from("submission_authors")
      .select("name, affiliation, email, orcid, is_corresponding")
      .eq("submission_id", id)
      .order("position"),
    db
      .from("submission_files")
      .select("id, kind, version, original_name, size_bytes, created_at, visible_to_author, uploaded_by")
      .eq("submission_id", id)
      .order("created_at"),
    db
      .from("submission_events")
      .select("id, from_status, to_status, message, visibility, created_at")
      .eq("submission_id", id)
      .order("created_at"),
    db
      .from("payments")
      .select("id, fee_type, amount_kobo, status, reference, paid_at, receipt_number, waiver_reason")
      .eq("submission_id", id)
      .order("created_at"),
    db
      .from("review_assignments")
      .select(
        "id, reviewer_id, round, status, due_at, invited_at, responded_at, recommendation, comments_to_author, comments_to_editor, submitted_at, reviewer:profiles!review_assignments_reviewer_id_fkey ( full_name, email )",
      )
      .eq("submission_id", id)
      .order("round")
      .order("invited_at")
      .returns<Review[]>(),
    db
      .from("profiles")
      .select("id, full_name, email, expertise, role")
      .in("role", ["reviewer", "editor"])
      .eq("is_active", true)
      .order("full_name"),
    db
      .from("profiles")
      .select("id, full_name, email")
      .in("role", ["super_admin", "editor", "book_review_editor"])
      .eq("is_active", true)
      .order("full_name"),
    getSettings(),
    getFlags(),
  ]);
  const { data: loads } = await db
    .from("review_assignments")
    .select("reviewer_id")
    .in("status", ["invited", "accepted"]);

  const feesOn = settings.fees.enabled && flags.fees_enabled;
  const status = s.status as SubmissionStatus;
  const canEdit = viewer.role !== "finance_officer";
  const settled = (fee: string) =>
    payments.data?.some((p) => p.fee_type === fee && ["success", "waived"].includes(p.status));
  const waivable = (["review", "publication"] as const).filter(
    (f) =>
      feesOn && !settled(f) && (f === "review" ? status === "awaiting_review_fee" : status === "accepted_awaiting_fee"),
  );
  const reviewList = reviews.data ?? [];
  const round = Math.max(1, ...reviewList.map((r) => r.round)) + (status === "revised_received" ? 1 : 0);
  const reviewerLabel = new Map(reviewList.map((r, i) => [r.id, `Reviewer ${i + 1}`]));
  const assigned = new Set(
    reviewList
      .filter((r) => r.round === round && !["declined", "cancelled"].includes(r.status))
      .map((r) => r.reviewer_id),
  );
  const options: ReviewerOption[] = (pool.data ?? [])
    .filter((p) => !assigned.has(p.id))
    .map((p) => ({
      id: p.id,
      name: p.full_name || p.email,
      email: p.email,
      expertise: p.expertise ?? [],
      role: p.role,
      load: loads?.filter((l) => l.reviewer_id === p.id).length ?? 0,
    }));
  const due = isoDateFromNow(21);
  const canCreateArticle = ["accepted_awaiting_fee", "in_production", "published"].includes(status);
  const box = "admin-box";
  const h2 = "font-display text-[1.15rem]";

  return (
    <>
      <AdminPageHeader
        crumbs={[
          { href: "/admin", label: "Admin" },
          { href: "/admin/submissions", label: "Submissions" },
        ]}
        title={s.title}
        description={
          <>
            <span className="tabular">{s.public_id}</span> · {ARTICLE_TYPE_LABEL[s.type as ArticleType]} ·{" "}
            {(s.category as unknown as { name: string } | null)?.name} ·{" "}
            <strong className="text-fg">{STATUS_LABEL[status]}</strong>
          </>
        }
        actions={
          canEdit && canCreateArticle ? (
            s.article_id ? (
              <Link href={`/admin/articles/${s.article_id}`} className="btn-line">
                Open the article →
              </Link>
            ) : (
              <ActionButton
                variant="primary"
                run={createArticleFromSubmission.bind(null, s.id)}
                redirectTo="/admin/articles/{id}"
              >
                Create article from submission
              </ActionButton>
            )
          ) : null
        }
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <section className={box} aria-labelledby="abs">
            <h2 id="abs" className={h2}>
              Abstract
            </h2>
            <p className="reading mt-3 text-[1rem]">{s.abstract}</p>
            <p className="text-muted mt-3 text-[0.86rem]">
              Keywords: {(s.keywords as string[]).join(", ")} · Citation style:{" "}
              {s.citation_style === "mla9" ? "MLA 9th" : "APA 7th"}
            </p>
          </section>

          <section className={box} aria-labelledby="rv">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="rv" className={h2}>
                Peer review
              </h2>
              <p className="text-muted text-[0.82rem]">
                Double-blind: reviewers never see author names; authors never see reviewers.
              </p>
            </div>
            {!reviewList.length ? (
              <p className="text-muted mt-3 text-[0.9rem]">No reviewers assigned yet.</p>
            ) : (
              <ol className="mt-4 space-y-4">
                {reviewList.map((r) => {
                  const report = files.data?.find((f) => f.kind === "review_report" && f.uploaded_by === r.reviewer_id);
                  const label = reviewerLabel.get(r.id)!;
                  const overdue = ["invited", "accepted"].includes(r.status) && isPast(r.due_at);
                  return (
                    <li key={r.id} className="border-rule rounded-[2px] border p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <p className="font-medium">
                          {label} · <span className="text-muted font-normal">round {r.round}</span>
                        </p>
                        <span
                          className={clsx(
                            "smallcaps text-[0.78rem]",
                            r.status === "submitted" ? "text-brand" : overdue ? "text-accent" : "text-muted",
                          )}
                        >
                          {overdue ? "Overdue" : REVIEW_STATUS_LABEL[r.status]}
                        </span>
                      </div>
                      <p className="text-muted mt-1 text-[0.84rem]">
                        {r.reviewer?.full_name} · {r.reviewer?.email} · due {formatDate(r.due_at)}
                        {r.submitted_at ? ` · submitted ${formatDate(r.submitted_at)}` : ""}
                      </p>
                      {r.status === "submitted" && (
                        <div className="mt-3 space-y-3 text-[0.9rem]">
                          <p>
                            Recommendation:{" "}
                            <strong>{r.recommendation ? RECOMMENDATION_LABEL[r.recommendation] : "—"}</strong>
                          </p>
                          {r.comments_to_author && (
                            <div>
                              <p className="smallcaps text-muted text-[0.74rem]">Comments for the author</p>
                              <p className="mt-1 whitespace-pre-line">{r.comments_to_author}</p>
                            </div>
                          )}
                          {r.comments_to_editor && (
                            <div className="border-thread border-l-2 pl-3">
                              <p className="smallcaps text-thread-text text-[0.74rem]">Confidential, for the editors</p>
                              <p className="mt-1 whitespace-pre-line">{r.comments_to_editor}</p>
                            </div>
                          )}
                          {report && (
                            <a href={`/api/submission-files/${report.id}`} className="underline underline-offset-4">
                              Download the review report ({report.original_name})
                            </a>
                          )}
                        </div>
                      )}
                      {canEdit && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.status === "submitted" && r.comments_to_author && (
                            <ActionButton
                              run={shareReviewComments.bind(null, r.id, s.id, label)}
                              confirm={{
                                title: `Share ${label}’s comments with the author?`,
                                description:
                                  "The author receives the comments for the author only, without the reviewer’s name. Confidential comments are never shared.",
                                confirmLabel: "Share comments",
                              }}
                            >
                              Share comments with author
                            </ActionButton>
                          )}
                          {["invited", "accepted"].includes(r.status) && (
                            <>
                              <ActionButton variant="quiet" run={extendReview.bind(null, r.id, s.id, 7)}>
                                Extend by 7 days
                              </ActionButton>
                              <ActionButton
                                variant="quiet"
                                run={cancelReview.bind(null, r.id, s.id)}
                                confirm={{
                                  title: "Cancel this review?",
                                  description: "The reviewer will no longer see the manuscript.",
                                  confirmLabel: "Cancel review",
                                  tone: "danger",
                                }}
                              >
                                Cancel
                              </ActionButton>
                            </>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            {canEdit && !["published", "rejected", "withdrawn", "draft", "awaiting_review_fee"].includes(status) && (
              <div className="border-rule mt-5 border-t pt-5">
                <h3 className="mb-3 text-[0.95rem] font-medium">Invite a reviewer</h3>
                <InviteReviewer id={s.id} reviewers={options} round={round} defaultDue={due} />
              </div>
            )}
          </section>

          <section className={box} aria-labelledby="au">
            <h2 id="au" className={h2}>
              Authors <span className="text-muted font-sans text-[0.8rem]">(never shown to reviewers)</span>
            </h2>
            <ul className="mt-3 space-y-2 text-[0.92rem]">
              {authors.data?.map((a) => (
                <li key={a.email}>
                  {a.name}
                  {a.is_corresponding && <span className="text-accent ml-2 text-[0.8rem]">corresponding</span>}
                  <span className="text-muted block">
                    {[a.affiliation, a.email, a.orcid].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={box} aria-labelledby="fi">
            <h2 id="fi" className={h2}>
              Files
            </h2>
            <ul className="mt-3 space-y-2 text-[0.9rem]">
              {files.data?.map((f) => (
                <li key={f.id} className="flex flex-wrap justify-between gap-3">
                  <a
                    href={`/api/submission-files/${f.id}`}
                    className="decoration-rule hover:decoration-thread underline underline-offset-4"
                  >
                    {FILE_LABEL[f.kind] ?? f.kind} v{f.version} · {f.original_name}
                  </a>
                  <span className="tabular text-muted">
                    {!f.visible_to_author && <span className="text-thread-text mr-2">private</span>}
                    {(f.size_bytes / 1024 / 1024).toFixed(1)} MB · {formatDate(f.created_at)}
                  </span>
                </li>
              ))}
            </ul>
            {canEdit && (
              <div className="border-rule mt-5 grid gap-5 border-t pt-5 md:grid-cols-2">
                <StaffUpload id={s.id} kind="plagiarism_report" />
                <StaffUpload id={s.id} kind="reviewer_comments" />
              </div>
            )}
          </section>

          <section className={box} aria-labelledby="hi">
            <h2 id="hi" className={h2}>
              History and messages
            </h2>
            <ol className="mt-3 space-y-3 text-[0.92rem]">
              {events.data?.map((e) => (
                <li key={e.id} className="border-rule border-l-2 pl-4">
                  <span className="tabular text-muted">{formatDate(e.created_at)}</span>
                  {e.to_status && <span> · {STATUS_LABEL[e.to_status as SubmissionStatus]}</span>}
                  {e.visibility === "internal" && <span className="text-accent ml-2 text-[0.78rem]">internal</span>}
                  {e.message && <p className="mt-1 whitespace-pre-line">{e.message}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="col-span-12 space-y-6 xl:col-span-4">
          {canEdit && <StatusControl id={s.id} moves={editorTransitions(status, feesOn)} />}
          <section className={box} aria-labelledby="ed">
            <h2 id="ed" className={clsx(h2, "mb-4")}>
              Editorial details
            </h2>
            {canEdit ? (
              <EditorialDetails
                id={s.id}
                version={s.version}
                similarity={s.similarity_percent != null ? Number(s.similarity_percent) : null}
                receivedAt={s.received_at}
                acceptedAt={s.accepted_at}
                handlingEditor={s.handling_editor_id}
                editors={(editors.data ?? []).map((e) => ({ id: e.id, name: e.full_name || e.email }))}
              />
            ) : (
              <dl className="text-[0.9rem]">
                <dt className="text-muted">Received</dt>
                <dd>{formatDate(s.received_at) || "—"}</dd>
              </dl>
            )}
          </section>
          <section className={box} aria-labelledby="pay">
            <h2 id="pay" className={h2}>
              Fees
            </h2>
            <ul className="mt-3 space-y-2 text-[0.9rem]">
              {payments.data?.map((p) => (
                <li key={p.id}>
                  {p.fee_type === "review" ? "Review" : "Publication"} ·{" "}
                  {p.status === "waived" ? "waived" : `${formatNaira(p.amount_kobo)} ${p.status}`}
                  <span className="tabular text-muted block text-[0.82rem]">
                    {p.reference}
                    {p.receipt_number ? ` · ${p.receipt_number}` : ""}
                    {p.waiver_reason ? ` · ${p.waiver_reason}` : ""}
                  </span>
                </li>
              ))}
              {!payments.data?.length && (
                <li className="text-muted">{feesOn ? "No payments yet." : "Fees are switched off."}</li>
              )}
            </ul>
          </section>
          {canEdit && <WaiveControl id={s.id} fees={["super_admin", "editor"].includes(viewer.role) ? waivable : []} />}
          {canEdit && <NoteControl id={s.id} />}
        </aside>
      </div>
    </>
  );
}
