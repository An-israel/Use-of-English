import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { Breadcrumbs } from "@/components/journal/Breadcrumbs";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { requireViewer } from "@/lib/auth";
import { getCategories, getFlags, getSettings } from "@/lib/data";
import { formatDate, formatNaira } from "@/lib/format";
import { FILE_KINDS } from "@/lib/submission";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { AUTHOR_NEXT_STEP, STATUS_LABEL, canWithdraw, type SubmissionStatus } from "@/lib/workflow";
import { MessageForm, PayFee, RevisionUpload, WithdrawForm } from "./Panels";

export const metadata: Metadata = { title: "Submission", robots: { index: false } };

export default function SubmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Sub = {
  id: string;
  author_id: string;
  public_id: string | null;
  title: string;
  type: ArticleType;
  status: SubmissionStatus;
  category_id: string | null;
  submitted_at: string | null;
  created_at: string;
};

async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/account/submissions/${id}`);
  const supabase = await userClient();
  const { data: s } = await supabase
    .from("submissions")
    .select("id, author_id, public_id, title, type, status, category_id, submitted_at, created_at")
    .eq("id", id)
    .maybeSingle<Sub>();
  if (!s || s.author_id !== viewer.id) notFound();

  const [{ data: authors }, { data: events }, { data: files }, { data: payments }, settings, flags, categories] =
    await Promise.all([
      supabase
        .from("submission_authors")
        .select("name, affiliation, is_corresponding")
        .eq("submission_id", id)
        .order("position"),
      supabase
        .from("submission_events")
        .select("id, from_status, to_status, message, actor_id, created_at")
        .eq("submission_id", id)
        .order("created_at"),
      supabase
        .from("submission_files")
        .select("id, kind, version, original_name, created_at")
        .eq("submission_id", id)
        .order("created_at"),
      supabase
        .from("payments")
        .select("id, fee_type, amount_kobo, status, paid_at, receipt_number, receipt_path, reference, waiver_reason")
        .eq("submission_id", id)
        .order("created_at"),
      getSettings(),
      getFlags(),
      getCategories(),
    ]);
  const feesOn = settings.fees.enabled && flags.fees_enabled;
  const settled = (fee: string) =>
    payments?.some((p) => p.fee_type === fee && (p.status === "success" || p.status === "waived"));
  const letterReady = ["in_production", "published"].includes(s.status) && (!feesOn || settled("publication"));
  const category = categories.find((c) => c.id === s.category_id);

  return (
    <div className="max-w-page mx-auto px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
      <Breadcrumbs items={[{ label: "My account", href: "/account" }, { label: s.public_id ?? "Draft" }]} />

      {sp.new && (
        <div role="status" className="border-brand/30 bg-brand/5 mt-8 rounded-[3px] border p-6">
          <p className="font-display text-[1.4rem]">Submission received</p>
          <p className="text-muted mt-1">
            Your submission ID is <strong className="tabular text-fg">{s.public_id}</strong>. We have emailed you a
            confirmation.
          </p>
        </div>
      )}

      <header className="grid grid-cols-12 gap-x-6 gap-y-6 py-10">
        <div className="col-span-12 lg:col-span-8">
          <p className="smallcaps text-muted text-[0.85rem]">
            <span className="tabular">{s.public_id ?? "Draft"}</span> · {ARTICLE_TYPE_LABEL[s.type]}
            {category ? ` · ${category.name}` : ""}
          </p>
          <h1 className="font-display mt-3 text-[clamp(1.9rem,1.5rem+1.6vw,2.8rem)] leading-tight">
            {s.title || "Untitled draft"}
          </h1>
          <p className="text-muted mt-3">{authors?.map((a) => a.name).join(", ")}</p>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <p className="smallcaps text-muted text-[0.78rem]">Status</p>
          <p className="font-display mt-1 text-[1.5rem]">{STATUS_LABEL[s.status]}</p>
          {AUTHOR_NEXT_STEP[s.status] && <p className="text-muted mt-1 text-[0.92rem]">{AUTHOR_NEXT_STEP[s.status]}</p>}
          {s.status === "draft" && (
            <Link
              href={`/submit/${s.id}`}
              className="bg-brand text-brand-fg mt-4 inline-block rounded-sm px-5 py-3 font-medium"
            >
              Continue the draft
            </Link>
          )}
        </div>
        <div className="col-span-12">
          <StatusTimeline status={s.status} feesEnabled={feesOn} />
        </div>
      </header>

      <div className="border-rule grid grid-cols-12 gap-x-6 gap-y-12 border-t pt-10">
        <div className="col-span-12 space-y-10 lg:col-span-7">
          {s.status === "awaiting_review_fee" && feesOn && (
            <PayFee id={s.id} fee="review" amountKobo={settings.fees.reviewKobo} />
          )}
          {s.status === "accepted_awaiting_fee" && feesOn && (
            <PayFee id={s.id} fee="publication" amountKobo={settings.fees.publicationKobo} />
          )}
          {s.status === "revisions_requested" && <RevisionUpload id={s.id} />}
          {letterReady && (
            <div className="border-rule bg-surface rounded-[3px] border p-6">
              <p className="font-display text-[1.3rem]">Letter of acceptance</p>
              <p className="text-muted mt-1 text-[0.92rem]">
                Your manuscript has been accepted. Download the official letter as a PDF.
              </p>
              <a
                href={`/api/acceptance-letter/${s.id}`}
                className="bg-brand text-brand-fg hover:bg-brand-hover mt-4 inline-block rounded-sm px-5 py-3 font-medium"
              >
                Download acceptance letter
              </a>
            </div>
          )}

          <section aria-labelledby="history">
            <h2 id="history" className="font-display text-[1.5rem]">
              History and messages
            </h2>
            <ol className="border-rule mt-5 border-l">
              {(events ?? []).map((e) => (
                <li key={e.id} className="relative pb-6 pl-6">
                  <span
                    aria-hidden="true"
                    className="border-thread bg-bg absolute top-1.5 -left-[5px] inline-block size-2.5 rotate-45 border"
                  />
                  <p className="tabular text-muted text-[0.82rem]">{formatDate(e.created_at)}</p>
                  {e.to_status && <p className="mt-0.5">{STATUS_LABEL[e.to_status as SubmissionStatus]}</p>}
                  {e.message && (
                    <p
                      className={`mt-1 rounded-sm p-3 text-[0.95rem] ${e.actor_id === viewer.id ? "bg-surface" : "border-thread bg-surface border-l-2"}`}
                    >
                      <span className="smallcaps text-muted mb-1 block text-[0.75rem]">
                        {e.actor_id === viewer.id ? "You" : "Editorial office"}
                      </span>
                      {e.message}
                    </p>
                  )}
                </li>
              ))}
              {(events ?? []).length === 0 && <li className="text-muted pl-6">Nothing yet.</li>}
            </ol>
            {s.status !== "draft" && (
              <div className="mt-4">
                <MessageForm id={s.id} />
              </div>
            )}
          </section>
        </div>

        <aside className="col-span-12 space-y-10 lg:col-span-4 lg:col-start-9">
          <section aria-labelledby="payments">
            <h2 id="payments" className="font-display text-[1.3rem]">
              Payments and receipts
            </h2>
            <ul className="divide-rule border-rule mt-4 divide-y border-y text-[0.92rem]">
              {(payments ?? [])
                .filter((p) => ["success", "waived", "refunded"].includes(p.status))
                .map((p) => (
                  <li key={p.id} className="py-3">
                    <p>{p.fee_type === "review" ? "Review fee" : "Publication fee"}</p>
                    <p className="tabular text-muted">
                      {p.status === "waived" ? "Waived" : formatNaira(p.amount_kobo)} · {formatDate(p.paid_at)}
                    </p>
                    {p.receipt_path && (
                      <a
                        href={`/api/receipts/${p.id}`}
                        className="text-brand decoration-thread mt-1 inline-block underline underline-offset-4"
                      >
                        Receipt {p.receipt_number}
                      </a>
                    )}
                    {p.status === "success" && !p.receipt_path && (
                      <p className="text-muted text-[0.85rem]">Receipt being prepared…</p>
                    )}
                  </li>
                ))}
              {!(payments ?? []).some((p) => ["success", "waived", "refunded"].includes(p.status)) && (
                <li className="text-muted py-3">No payments yet.</li>
              )}
            </ul>
          </section>
          <section aria-labelledby="files">
            <h2 id="files" className="font-display text-[1.3rem]">
              Files
            </h2>
            <ul className="mt-4 space-y-2 text-[0.92rem]">
              {(files ?? []).map((f) => (
                <li key={f.id}>
                  <a
                    href={`/api/submission-files/${f.id}`}
                    className="decoration-rule hover:decoration-thread underline underline-offset-4"
                  >
                    {FILE_KINDS[f.kind as keyof typeof FILE_KINDS]?.label ?? f.kind.replace("_", " ")}
                    {f.version > 1 ? ` (v${f.version})` : ""}
                  </a>
                  <span className="text-muted block text-[0.82rem]">{f.original_name}</span>
                </li>
              ))}
            </ul>
          </section>
          {canWithdraw(s.status) && s.status !== "draft" && <WithdrawForm id={s.id} />}
        </aside>
      </div>
    </div>
  );
}
