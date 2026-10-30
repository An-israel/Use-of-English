import type { Metadata } from "next";
import Link from "next/link";
import { FEE_INTEGRITY_STATEMENT } from "@/content/journal";
import { Countdown } from "@/components/home/Countdown";
import { EmptyState } from "@/components/journal/EmptyState";
import { PageHeader } from "@/components/journal/PageHeader";
import { getCallForPapers, getCategories, getFlags, getSettings } from "@/lib/data";
import { formatDate, formatNaira } from "@/lib/format";
import { sanitize } from "@/lib/sanitize";

export const metadata: Metadata = {
  title: "Call for Papers",
  description: "The current JHTS call for papers: the next issue, its deadline and how to submit.",
  alternates: { canonical: "/call-for-papers" },
};

export default async function CallForPapersPage() {
  const [cfp, categories, s, flags] = await Promise.all([
    getCallForPapers(),
    getCategories(),
    getSettings(),
    getFlags(),
  ]);
  const fees = s.fees.enabled && flags.fees_enabled;
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Authors" }, { label: "Call for Papers" }]}
        eyebrow="Call for papers"
        title={cfp ? cfp.targetLabel : "Call for Papers"}
        summary={cfp?.bannerText}
        seed={59}
      />
      {!cfp ? (
        <div className="max-w-page mx-auto px-4 py-16 sm:px-6 lg:px-10">
          <EmptyState title="No open call at the moment">The next call for papers will be announced here.</EmptyState>
        </div>
      ) : (
        <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 gap-y-12 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
          <div className="col-span-12 lg:col-span-7">
            <div className="prose-jhts reading" dangerouslySetInnerHTML={{ __html: sanitize(cfp.summaryHtml) }} />
            <h2 className="font-display mt-14 text-[1.65rem]">Scope</h2>
            <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {categories.map((c) => (
                <li key={c.slug} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-block size-2 shrink-0 rotate-45"
                    style={{ backgroundColor: `var(${c.threadColor})` }}
                  />
                  <Link
                    href={`/subjects/${c.slug}`}
                    className="hover:decoration-thread hover:underline hover:underline-offset-4"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-muted mt-8">
              Research articles, theoretical papers, critical reviews and book reviews are welcome. Please follow the{" "}
              <Link href="/author-guidelines" className="text-brand decoration-thread underline underline-offset-4">
                author guidelines
              </Link>
              .
            </p>
          </div>
          <aside className="col-span-12 lg:col-span-4 lg:col-start-9">
            <div className="border-rule bg-surface space-y-8 rounded-[3px] border p-7 lg:sticky lg:top-24">
              <div>
                <p className="smallcaps text-muted text-[0.78rem]">Time left to submit</p>
                <div className="mt-4">
                  <Countdown deadline={cfp.submissionDeadline} />
                </div>
              </div>
              <dl className="border-rule space-y-3 border-t pt-6 text-[0.92rem]">
                <div>
                  <dt className="text-muted">Submission deadline</dt>
                  <dd className="tabular font-display mt-0.5 text-[1.2rem]">{formatDate(cfp.submissionDeadline)}</dd>
                </div>
                {cfp.reviewPeriod && (
                  <div>
                    <dt className="text-muted">Review period</dt>
                    <dd className="mt-0.5">{cfp.reviewPeriod.replace(" [TO CONFIRM]", "")}</dd>
                  </div>
                )}
                {cfp.publicationMonth && (
                  <div>
                    <dt className="text-muted">Publication</dt>
                    <dd className="mt-0.5">{cfp.publicationMonth}</dd>
                  </div>
                )}
              </dl>
              {fees && (
                <div className="border-rule border-t pt-6 text-[0.9rem]">
                  <p className="text-muted">Fees</p>
                  <p className="mt-1">
                    <span className="tabular">{formatNaira(s.fees.reviewKobo)}</span> review fee at submission;{" "}
                    <span className="tabular">{formatNaira(s.fees.publicationKobo)}</span> publication fee only after
                    acceptance.
                  </p>
                  <p className="text-muted mt-2 italic">{FEE_INTEGRITY_STATEMENT}</p>
                </div>
              )}
              {flags.submissions_open && (
                <Link
                  href="/submit"
                  className="bg-brand text-brand-fg hover:bg-brand-hover block rounded-sm px-5 py-3.5 text-center font-medium"
                >
                  Submit a manuscript
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
