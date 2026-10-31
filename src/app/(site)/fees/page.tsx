import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEE_INTEGRITY_STATEMENT } from "@/content/journal";
import { PageHeader } from "@/components/journal/PageHeader";
import { ProseBody } from "@/components/journal/ProseBody";
import { getFlags, getPage, getSettings } from "@/lib/data";
import { formatNaira } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fees and Payment",
  description: "JHTS review and publication fees, what they cover, and how to pay.",
  alternates: { canonical: "/fees" },
};

export default async function FeesPage() {
  const [page, s, flags] = await Promise.all([getPage("page", "fees-and-payment"), getSettings(), getFlags()]);
  if (!page) notFound();
  const enabled = s.fees.enabled && flags.fees_enabled;
  const rows = [
    {
      fee: "Review and plagiarism check",
      amount: s.fees.reviewKobo,
      when: "At submission. Your manuscript goes to the editors once payment is confirmed.",
    },
    {
      fee: "Publication",
      amount: s.fees.publicationKobo,
      when: "Only after your manuscript has been accepted. Never before a decision.",
    },
  ];
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Authors" }, { label: page.title }]}
        eyebrow="For authors"
        title={page.title}
        summary={page.summary}
        seed={53}
      />
      <ProseBody
        html={page.bodyHtml}
        toc={false}
        updatedAt={page.updatedAt}
        before={
          <div className="mb-14 space-y-10">
            {enabled ? (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Fees table">
                <table className="w-full min-w-[32rem] border-collapse text-left">
                  <caption className="sr-only">JHTS fees</caption>
                  <thead>
                    <tr className="border-fg border-b-2">
                      <th scope="col" className="smallcaps text-muted py-3 pr-4 text-[0.8rem] font-normal">
                        Fee
                      </th>
                      <th scope="col" className="smallcaps text-muted py-3 pr-4 text-right text-[0.8rem] font-normal">
                        Amount
                      </th>
                      <th scope="col" className="smallcaps text-muted py-3 text-[0.8rem] font-normal">
                        When it is paid
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.fee} className="border-rule border-b align-top">
                        <th scope="row" className="font-display py-5 pr-4 text-[1.15rem] font-normal">
                          {r.fee}
                        </th>
                        <td className="tabular font-display py-5 pr-4 text-right text-[1.4rem]">
                          {formatNaira(r.amount)}
                        </td>
                        <td className="text-muted py-5 text-[0.92rem]">{r.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-muted mt-4 text-[0.92rem]">
                  <span className="text-fg">What the fees cover:</span> {s.fees.covers}
                </p>
              </div>
            ) : (
              <p className="border-rule bg-surface rounded-[3px] border p-6">JHTS is not charging fees at present.</p>
            )}
            <p
              className="border-accent bg-surface font-display border-l-4 px-6 py-5 text-[1.3rem] leading-snug"
              role="note"
            >
              {FEE_INTEGRITY_STATEMENT}
            </p>
          </div>
        }
      />
    </>
  );
}
