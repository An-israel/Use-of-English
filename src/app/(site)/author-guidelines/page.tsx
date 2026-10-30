import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEE_INTEGRITY_STATEMENT } from "@/content/journal";
import { PageHeader } from "@/components/journal/PageHeader";
import { ProseBody } from "@/components/journal/ProseBody";
import { getFlags, getPage, getSettings } from "@/lib/data";
import { formatNaira } from "@/lib/format";

export const metadata: Metadata = {
  title: "Author Guidelines",
  description: "How to prepare, format and submit a manuscript to JHTS.",
  alternates: { canonical: "/author-guidelines" },
};

const CHECKLIST = [
  "Original, unpublished and not under review elsewhere",
  "Word (.docx), Times New Roman 12 pt, double-spaced",
  "APA 7th or MLA 9th, used consistently",
  "Abstract of 150 to 250 words and 3 to 6 keywords",
  "Manuscript anonymised for double-blind review",
  "Separate title page with author details",
];

export default async function GuidelinesPage() {
  const [page, s, flags] = await Promise.all([getPage("page", "author-guidelines"), getSettings(), getFlags()]);
  if (!page) notFound();
  const fees = s.fees.enabled && flags.fees_enabled;
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Authors" }, { label: page.title }]}
        eyebrow="For authors"
        title={page.title}
        summary={page.summary}
        seed={47}
      />
      <ProseBody
        html={page.bodyHtml}
        updatedAt={page.updatedAt}
        aside={
          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="border-rule bg-surface rounded-[3px] border p-6">
              <p className="smallcaps text-muted text-[0.78rem]">Before you submit</p>
              <ul className="mt-4 space-y-3 text-[0.9rem]">
                {CHECKLIST.map((c) => (
                  <li key={c} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="bg-thread mt-[0.45rem] inline-block size-1.5 shrink-0 rotate-45"
                    />
                    {c}
                  </li>
                ))}
              </ul>
              {flags.submissions_open && (
                <Link
                  href="/submit"
                  className="bg-brand text-brand-fg hover:bg-brand-hover mt-6 block rounded-sm px-4 py-3 text-center font-medium"
                >
                  Submit a manuscript
                </Link>
              )}
            </div>
            {fees && (
              <div className="border-rule rounded-[3px] border p-6 text-[0.9rem]">
                <p className="smallcaps text-muted text-[0.78rem]">Fees</p>
                <p className="mt-3">
                  Review <span className="tabular">{formatNaira(s.fees.reviewKobo)}</span> at submission; publication{" "}
                  <span className="tabular">{formatNaira(s.fees.publicationKobo)}</span> after acceptance.
                </p>
                <p className="text-muted mt-3 italic">{FEE_INTEGRITY_STATEMENT}</p>
                <Link
                  href="/fees"
                  className="text-brand decoration-thread mt-3 inline-block underline underline-offset-4"
                >
                  Fees and payment
                </Link>
              </div>
            )}
          </div>
        }
      />
    </>
  );
}
