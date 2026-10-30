import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { getFlags, getSettings } from "@/lib/data";
import { formatDate, formatNaira } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { STATUS_LABEL, editorTransitions, type SubmissionStatus } from "@/lib/workflow";
import { NoteControl, StatusControl, WaiveControl } from "./Controls";

export const metadata = { title: "Submission" };

export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireRole(
    ["super_admin", "editor", "book_review_editor", "finance_officer"],
    "/admin/submissions",
  );
  const { id } = await params;
  const supabase = await userClient();
  const { data: s } = await supabase
    .from("submissions")
    .select(
      "id, public_id, title, type, status, abstract, keywords, citation_style, similarity_percent, submitted_at, received_at, accepted_at, category:categories ( name )",
    )
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();
  const [{ data: authors }, { data: files }, { data: events }, { data: payments }, settings, flags] = await Promise.all(
    [
      supabase
        .from("submission_authors")
        .select("name, affiliation, email, orcid, is_corresponding")
        .eq("submission_id", id)
        .order("position"),
      supabase
        .from("submission_files")
        .select("id, kind, version, original_name, size_bytes, created_at")
        .eq("submission_id", id)
        .order("created_at"),
      supabase
        .from("submission_events")
        .select("id, from_status, to_status, message, visibility, created_at")
        .eq("submission_id", id)
        .order("created_at"),
      supabase
        .from("payments")
        .select("id, fee_type, amount_kobo, status, reference, paid_at, receipt_number, waiver_reason")
        .eq("submission_id", id)
        .order("created_at"),
      getSettings(),
      getFlags(),
    ],
  );
  const feesOn = settings.fees.enabled && flags.fees_enabled;
  const status = s.status as SubmissionStatus;
  const canEdit = viewer.role !== "finance_officer";
  const settled = (fee: string) =>
    payments?.some((p) => p.fee_type === fee && ["success", "waived"].includes(p.status));
  const waivable = (["review", "publication"] as const).filter(
    (f) =>
      feesOn && !settled(f) && (f === "review" ? status === "awaiting_review_fee" : status === "accepted_awaiting_fee"),
  );
  const section = "rounded-[3px] border border-rule bg-surface p-5";

  return (
    <>
      <AdminPageHeader
        title={s.title}
        description={
          <>
            <span className="tabular">{s.public_id}</span> · {ARTICLE_TYPE_LABEL[s.type as ArticleType]} ·{" "}
            {(s.category as unknown as { name: string } | null)?.name} · <strong>{STATUS_LABEL[status]}</strong>
          </>
        }
        actions={
          <Link href="/admin/submissions" className="text-muted hover:text-fg text-[0.9rem]">
            ← All submissions
          </Link>
        }
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-6 xl:col-span-8">
          <section className={section} aria-labelledby="abs">
            <h2 id="abs" className="font-display text-[1.2rem]">
              Abstract
            </h2>
            <p className="reading mt-3 text-[1rem]">{s.abstract}</p>
            <p className="text-muted mt-3 text-[0.88rem]">
              Keywords: {(s.keywords as string[]).join(", ")} · Citation style:{" "}
              {s.citation_style === "mla9" ? "MLA 9th" : "APA 7th"}
            </p>
          </section>
          <section className={section} aria-labelledby="au">
            <h2 id="au" className="font-display text-[1.2rem]">
              Authors <span className="text-muted font-sans text-[0.8rem]">(never shown to reviewers)</span>
            </h2>
            <ul className="mt-3 space-y-2 text-[0.92rem]">
              {authors?.map((a) => (
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
          <section className={section} aria-labelledby="fi">
            <h2 id="fi" className="font-display text-[1.2rem]">
              Files
            </h2>
            <ul className="mt-3 space-y-2 text-[0.92rem]">
              {files?.map((f) => (
                <li key={f.id} className="flex flex-wrap justify-between gap-3">
                  <a
                    href={`/api/submission-files/${f.id}`}
                    className="decoration-rule hover:decoration-thread underline underline-offset-4"
                  >
                    {f.kind.replace("_", " ")} v{f.version} · {f.original_name}
                  </a>
                  <span className="tabular text-muted">
                    {(f.size_bytes / 1024 / 1024).toFixed(1)} MB · {formatDate(f.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className={section} aria-labelledby="hi">
            <h2 id="hi" className="font-display text-[1.2rem]">
              History
            </h2>
            <ol className="mt-3 space-y-3 text-[0.92rem]">
              {events?.map((e) => (
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
          <section className={section} aria-labelledby="pay">
            <h2 id="pay" className="font-display text-[1.2rem]">
              Fees
            </h2>
            <ul className="mt-3 space-y-2 text-[0.9rem]">
              {payments?.map((p) => (
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
              {!payments?.length && <li className="text-muted">No payments.</li>}
            </ul>
          </section>
          {canEdit && <StatusControl id={s.id} moves={editorTransitions(status, feesOn)} />}
          {canEdit && <WaiveControl id={s.id} fees={["super_admin", "editor"].includes(viewer.role) ? waivable : []} />}
          {canEdit && <NoteControl id={s.id} />}
        </aside>
      </div>
    </>
  );
}
