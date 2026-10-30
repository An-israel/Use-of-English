import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmailForm, ProfileForm } from "@/components/account/ProfileForms";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { EmptyState } from "@/components/journal/EmptyState";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { ArrowRightIcon } from "@/components/ui/icons";
import { requireViewer } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { getFlags, getSettings } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { REVIEW_STATUS_LABEL } from "@/lib/submission";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { AUTHOR_NEXT_STEP, ROLE_LABEL, STAFF_ROLES, STATUS_LABEL, type SubmissionStatus } from "@/lib/workflow";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}

type SubmissionRow = {
  id: string;
  public_id: string | null;
  title: string;
  type: ArticleType;
  status: SubmissionStatus;
  updated_at: string;
  submitted_at: string | null;
};

type ReviewRow = {
  assignment_id: string;
  title: string;
  type: ArticleType;
  review_status: string;
  due_at: string;
  round: number;
};

async function Account({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const viewer = await requireViewer("/account");
  const supabase = await userClient();
  const [{ data: submissions }, { data: reviews }, settings, flags] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, public_id, title, type, status, updated_at, submitted_at")
      .eq("author_id", viewer.id)
      .order("updated_at", { ascending: false })
      .returns<SubmissionRow[]>(),
    viewer.role === "reviewer" || STAFF_ROLES.includes(viewer.role)
      ? supabase
          .from("reviewer_submissions")
          .select("assignment_id, title, type, review_status, due_at, round")
          .order("due_at")
          .returns<ReviewRow[]>()
      : Promise.resolve({ data: [] as ReviewRow[] }),
    getSettings(),
    getFlags(),
  ]);
  const feesEnabled = settings.fees.enabled && flags.fees_enabled;
  const firstName = viewer.fullName.split(/\s+/).find((p) => !/^(prof|dr|assoc|mr|mrs|ms)\.?$/i.test(p)) ?? "";

  const section = "border-t border-rule py-12 lg:grid lg:grid-cols-12 lg:gap-x-6";
  const sectionHead = "lg:col-span-3";
  const sectionBody = "mt-6 lg:col-span-8 lg:col-start-5 lg:mt-0";

  return (
    <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6 py-12 lg:py-16">
        <div>
          <p className="smallcaps text-muted text-[0.85rem]">{ROLE_LABEL[viewer.role]} account</p>
          <h1 className="font-display mt-3 text-[clamp(2.2rem,1.7rem+2vw,3.4rem)] leading-tight">
            Welcome{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted mt-2">{viewer.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {STAFF_ROLES.includes(viewer.role) && (
            <Link
              href="/admin"
              className="border-fg/70 hover:bg-fg hover:text-bg rounded-sm border px-5 py-3 font-medium"
            >
              Open the admin dashboard
            </Link>
          )}
          {flags.submissions_open && viewer.role !== "finance_officer" && (
            <Link
              href="/submit"
              className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-5 py-3 font-medium"
            >
              New submission
            </Link>
          )}
        </div>
      </header>

      {sp.denied && (
        <p role="alert" className="border-accent/40 bg-accent/5 text-accent mb-8 rounded-sm border px-4 py-3">
          Your account doesn’t have access to that page.
        </p>
      )}
      {sp.password === "updated" && (
        <p role="status" className="border-brand/30 bg-brand/5 mb-8 rounded-sm border px-4 py-3">
          Your new password is saved.
        </p>
      )}

      <section aria-labelledby="subs" className={section}>
        <div className={sectionHead}>
          <h2 id="subs" className="font-display text-[1.6rem]">
            My submissions
          </h2>
          <p className="text-muted mt-2 text-[0.9rem]">Status, messages from the editors and receipts.</p>
        </div>
        <div className={sectionBody}>
          {!submissions?.length ? (
            <EmptyState title="No submissions yet">
              When you submit a manuscript, you can follow it here from screening to publication.{" "}
              {flags.submissions_open && (
                <Link href="/submit" className="text-brand decoration-thread underline underline-offset-4">
                  Start a submission
                </Link>
              )}
            </EmptyState>
          ) : (
            <ul className="divide-rule border-rule divide-y border-y">
              {submissions.map((s) => (
                <li key={s.id} className="py-6">
                  <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem]">
                    <span className="tabular">{s.public_id ?? "Draft"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{ARTICLE_TYPE_LABEL[s.type]}</span>
                    <span aria-hidden="true">·</span>
                    <span>Updated {formatDate(s.updated_at)}</span>
                  </div>
                  <Link
                    href={`/account/submissions/${s.id}`}
                    className="group mt-2 flex items-start justify-between gap-4"
                  >
                    <span className="font-display group-hover:decoration-thread text-[1.25rem] leading-snug group-hover:underline group-hover:underline-offset-4">
                      {s.title || "Untitled draft"}
                    </span>
                    <ArrowRightIcon width={18} height={18} className="text-brand mt-1.5 shrink-0" />
                  </Link>
                  <p className="mt-2 text-[0.92rem]">
                    <span className="font-medium">{STATUS_LABEL[s.status]}</span>
                    {AUTHOR_NEXT_STEP[s.status] && <span className="text-muted"> · {AUTHOR_NEXT_STEP[s.status]}</span>}
                  </p>
                  <div className="mt-4">
                    <StatusTimeline status={s.status} feesEnabled={feesEnabled} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {(reviews?.length ?? 0) > 0 || viewer.role === "reviewer" ? (
        <section aria-labelledby="reviews" className={section}>
          <div className={sectionHead}>
            <h2 id="reviews" className="font-display text-[1.6rem]">
              My reviews
            </h2>
            <p className="text-muted mt-2 text-[0.9rem]">
              Manuscripts the editors have asked you to review. Author names are withheld.
            </p>
          </div>
          <div className={sectionBody}>
            {!reviews?.length ? (
              <EmptyState title="No review requests">
                When an editor invites you to review, the manuscript appears here.
              </EmptyState>
            ) : (
              <ul className="divide-rule border-rule divide-y border-y">
                {reviews.map((r) => (
                  <li key={r.assignment_id} className="flex flex-wrap items-baseline justify-between gap-4 py-5">
                    <div>
                      <Link
                        href={`/review/${r.assignment_id}`}
                        className="font-display hover:decoration-thread text-[1.2rem] hover:underline hover:underline-offset-4"
                      >
                        {r.title}
                      </Link>
                      <p className="text-muted mt-1 text-[0.85rem]">
                        {ARTICLE_TYPE_LABEL[r.type]} · Round {r.round} ·{" "}
                        {REVIEW_STATUS_LABEL[r.review_status as keyof typeof REVIEW_STATUS_LABEL]}
                      </p>
                    </div>
                    <span className="tabular text-[0.9rem]">Due {formatDate(r.due_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="profile" className={section}>
        <div className={sectionHead}>
          <h2 id="profile" className="font-display text-[1.6rem]">
            Profile
          </h2>
          <p className="text-muted mt-2 text-[0.9rem]">Used to pre-fill your submissions.</p>
        </div>
        <div className={`${sectionBody} max-w-[32rem]`}>
          <ProfileForm
            defaults={{ fullName: viewer.fullName, affiliation: viewer.affiliation ?? "", orcid: viewer.orcid ?? "" }}
          />
        </div>
      </section>

      <section aria-labelledby="security" className={`${section} mb-16`}>
        <div className={sectionHead}>
          <h2 id="security" className="font-display text-[1.6rem]">
            Sign-in and security
          </h2>
        </div>
        <div className={`${sectionBody} grid max-w-[32rem] gap-12`}>
          <EmailForm current={viewer.email} />
          <div>
            <h3 className="font-display mb-4 text-[1.2rem]">Change password</h3>
            <SetPasswordForm next="/account?password=updated" />
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="text-muted decoration-rule hover:text-fg text-[0.95rem] underline underline-offset-4"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
