import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/journal/Breadcrumbs";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { requireViewer } from "@/lib/auth";
import { formatDate, isPast } from "@/lib/format";
import { RECOMMENDATION_LABEL, REVIEW_STATUS_LABEL, type Recommendation } from "@/lib/submission";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { Respond, ReviewForm } from "./Panels";

export const metadata: Metadata = { title: "Review", robots: { index: false } };

export default function ReviewPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

type Assignment = {
  assignment_id: string;
  status: keyof typeof REVIEW_STATUS_LABEL;
  round: number;
  due_at: string;
  recommendation: Recommendation | null;
  comments_to_author: string | null;
  comments_to_editor: string | null;
  submitted_at: string | null;
  version: number;
  submission_id: string;
  title: string;
  abstract: string;
  keywords: string[];
  type: ArticleType;
  category: string | null;
};

async function Detail({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const viewer = await requireViewer(`/review/${assignmentId}`);
  const db = await userClient();
  // The view returns only this reviewer's own assignments, with no author details.
  const { data: a } = await db
    .from("reviewer_assignment_detail")
    .select("*")
    .eq("assignment_id", assignmentId)
    .maybeSingle<Assignment>();
  if (!a) notFound();
  const [{ data: files }, { data: reports }] = await Promise.all([
    db
      .from("submission_files")
      .select("id, kind, version, created_at")
      .eq("submission_id", a.submission_id)
      .in("kind", ["manuscript", "revision"])
      .order("created_at", { ascending: false }),
    db
      .from("submission_files")
      .select("id, original_name, created_at")
      .eq("submission_id", a.submission_id)
      .eq("kind", "review_report")
      .eq("uploaded_by", viewer.id)
      .order("created_at", { ascending: false }),
  ]);
  const open = a.status === "invited" || a.status === "accepted";
  const overdue = open && isPast(a.due_at);

  return (
    <div className="max-w-page mx-auto px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Breadcrumbs items={[{ label: "My account", href: "/account" }, { label: "Review" }]} />
      <header className="grid grid-cols-12 gap-x-6 gap-y-6 py-10">
        <div className="col-span-12 lg:col-span-8">
          <p className="smallcaps text-muted text-[0.85rem]">
            {ARTICLE_TYPE_LABEL[a.type]}
            {a.category ? ` · ${a.category}` : ""} · Round {a.round}
          </p>
          <h1 className="font-display mt-3 text-[clamp(1.9rem,1.5rem+1.6vw,2.8rem)] leading-tight">{a.title}</h1>
          <p className="text-muted mt-3 text-[0.92rem]">
            Double-blind review: the authors’ names are withheld from you, and yours from them.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <p className="smallcaps text-muted text-[0.78rem]">Status</p>
          <p className="font-display mt-1 text-[1.5rem]">{overdue ? "Overdue" : REVIEW_STATUS_LABEL[a.status]}</p>
          <p className={`mt-1 text-[0.92rem] ${overdue ? "text-accent" : "text-muted"}`}>
            {a.status === "submitted" ? `Submitted ${formatDate(a.submitted_at)}` : `Due ${formatDate(a.due_at)}`}
          </p>
        </div>
      </header>

      <div className="border-rule grid grid-cols-12 gap-x-6 gap-y-12 border-t pt-10">
        <div className="col-span-12 space-y-10 lg:col-span-7">
          {a.status === "invited" && <Respond id={a.assignment_id} due={formatDate(a.due_at)} />}
          {a.status === "accepted" && (
            <ReviewForm
              id={a.assignment_id}
              version={a.version}
              recommendation={a.recommendation}
              toAuthor={a.comments_to_author ?? ""}
              toEditor={a.comments_to_editor ?? ""}
              reports={(reports ?? []).map((r) => r.original_name)}
            />
          )}
          {a.status === "submitted" && (
            <section aria-labelledby="yours" className="space-y-5">
              <h2 id="yours" className="font-display text-[1.5rem]">
                Your review
              </h2>
              <p>
                Recommendation: <strong>{a.recommendation ? RECOMMENDATION_LABEL[a.recommendation] : "—"}</strong>
              </p>
              {a.comments_to_author && (
                <div>
                  <p className="smallcaps text-muted text-[0.78rem]">Comments for the author</p>
                  <p className="reading mt-2 whitespace-pre-line">{a.comments_to_author}</p>
                </div>
              )}
              {a.comments_to_editor && (
                <div>
                  <p className="smallcaps text-muted text-[0.78rem]">Confidential comments for the editors</p>
                  <p className="reading mt-2 whitespace-pre-line">{a.comments_to_editor}</p>
                </div>
              )}
              <p className="text-muted text-[0.9rem]">Thank you for reviewing for JHTS.</p>
            </section>
          )}
          {(a.status === "declined" || a.status === "cancelled") && (
            <p className="text-muted">
              {a.status === "declined" ? "You declined this request." : "The editors withdrew this request."} Thank you.
            </p>
          )}

          <section aria-labelledby="abstract">
            <h2 id="abstract" className="font-display text-[1.5rem]">
              Abstract
            </h2>
            <p className="reading mt-4">{a.abstract}</p>
            <p className="text-muted mt-3 text-[0.88rem]">Keywords: {a.keywords.join(", ")}</p>
          </section>
        </div>
        <aside className="col-span-12 space-y-8 lg:col-span-4 lg:col-start-9">
          <section aria-labelledby="ms">
            <h2 id="ms" className="font-display text-[1.3rem]">
              Manuscript
            </h2>
            {a.status === "invited" ? (
              <p className="text-muted mt-3 text-[0.92rem]">
                Accept the invitation to download the anonymised manuscript.
              </p>
            ) : open || a.status === "submitted" ? (
              <ul className="mt-3 space-y-2 text-[0.92rem]">
                {(files ?? []).map((f) => (
                  <li key={f.id}>
                    <a
                      href={`/api/submission-files/${f.id}?as=review`}
                      className="decoration-rule hover:decoration-thread underline underline-offset-4"
                    >
                      {f.kind === "revision" ? "Revised manuscript" : "Manuscript"} v{f.version}
                    </a>
                    <span className="tabular text-muted ml-2">{formatDate(f.created_at)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          <section aria-labelledby="guide">
            <h2 id="guide" className="font-display text-[1.3rem]">
              Reviewing for JHTS
            </h2>
            <ul className="text-muted mt-3 list-disc space-y-1.5 pl-5 text-[0.9rem]">
              <li>Assess originality, argument, use of sources and contribution to the humanities.</li>
              <li>
                Write comments the author can act on; keep anything for the editors alone in the confidential box.
              </li>
              <li>Don’t try to identify the authors, and tell the editors about any conflict of interest.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
