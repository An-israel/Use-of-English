import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import type { CallForPapers } from "@/lib/types";
import { Countdown } from "./Countdown";

export function CfpBanner({ cfp }: { cfp: CallForPapers }) {
  return (
    <section aria-labelledby="cfp-title" className="max-w-page mx-auto px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="sec-gold-solid relative overflow-hidden rounded-[3px] shadow-[0_30px_60px_-40px_rgb(20_69_47/0.6)]">
        {/* Lozenges from the woven border, faint on the gold. */}
        <span
          aria-hidden="true"
          className="absolute -top-16 -right-16 size-64 rotate-45 border-[3px] border-[#14452f]/15"
        />
        <span aria-hidden="true" className="absolute top-6 right-6 size-28 rotate-45 border-2 border-[#14452f]/10" />
        <div className="relative grid grid-cols-12 gap-x-6 gap-y-10 p-8 sm:p-12 lg:p-16">
          <div className="col-span-12 lg:col-span-6">
            <p className="smallcaps text-[0.85rem] text-[#14452f]">Call for papers</p>
            <h2 id="cfp-title" className="font-display mt-3 text-[clamp(1.9rem,1.5rem+1.4vw,2.6rem)] leading-[1.08]">
              {cfp.targetLabel}
            </h2>
            <p className="text-muted mt-4 max-w-[30rem]">{cfp.bannerText}</p>
            <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-[0.92rem]">
              <dt className="smallcaps text-muted">Deadline</dt>
              <dd className="tabular">{formatDate(cfp.submissionDeadline)}</dd>
              {cfp.publicationMonth && (
                <>
                  <dt className="smallcaps text-muted">Publication</dt>
                  <dd>{cfp.publicationMonth}</dd>
                </>
              )}
            </dl>
          </div>
          <div className="col-span-12 flex flex-col justify-between gap-10 lg:col-span-5 lg:col-start-8">
            <Countdown deadline={cfp.submissionDeadline} />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="bg-brand text-brand-fg hover:bg-brand-hover inline-flex items-center gap-3 rounded-sm px-6 py-3.5 font-medium"
              >
                Submit a manuscript <ArrowRightIcon width={18} height={18} />
              </Link>
              <Link
                href="/call-for-papers"
                className="border-fg/80 hover:bg-fg hover:text-bg inline-flex items-center rounded-sm border px-6 py-3.5 font-medium"
              >
                Read the call
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
