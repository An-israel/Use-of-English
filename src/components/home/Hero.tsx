import Link from "next/link";
import { Weave } from "@/components/weave/Weave";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/format";
import { issuePath } from "@/lib/issues";
import type { CallForPapers, IssueSummary, SiteSettings } from "@/lib/types";

type Props = {
  settings: SiteSettings;
  cfp: CallForPapers | null;
  current: IssueSummary | null;
  submissionsOpen: boolean;
};

export function Hero({ settings, cfp, current, submissionsOpen }: Props) {
  return (
    <section className="border-rule relative isolate overflow-hidden border-b" aria-labelledby="hero-title">
      <Weave
        animate
        density="regular"
        colours={["var(--thread)", "var(--brand)", "var(--accent)"]}
        lozenges={0.05}
        opacity={0.2}
        fade="radial"
        strokeWidth={1.1}
        className="absolute inset-y-0 right-0 -z-10 h-full w-full md:w-[78%]"
      />
      <div className="max-w-page mx-auto grid grid-cols-12 gap-x-6 px-4 pt-14 pb-20 sm:px-6 md:pt-20 md:pb-28 lg:px-10 lg:pt-28 lg:pb-36">
        <div className="col-span-12 lg:col-span-9">
          <p className="smallcaps text-muted text-[0.85rem]">
            Est. {settings.foundedYear} · {settings.publisherShort}
          </p>
          <h1
            id="hero-title"
            className="display-tight font-display text-fg mt-6 text-[clamp(2.75rem,1.6rem+5.2vw,5.5rem)] font-medium"
          >
            Journal of Humanities <span className="text-brand pr-[0.06em] italic">and</span> Transcultural Studies
          </h1>
          <p className="font-reading text-muted mt-8 max-w-[34rem] text-[1.2rem] leading-relaxed md:text-[1.3rem]">
            {settings.tagline}.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            {/* Before the first issue, the main invitation is the Call for Papers. */}
            <Link
              href={current ? issuePath(current) : cfp ? "/call-for-papers" : "/issues"}
              className="group bg-brand text-brand-fg hover:bg-brand-hover inline-flex items-center gap-3 rounded-sm px-6 py-3.5 font-medium transition-colors"
            >
              {current ? "Read the current issue" : cfp ? "Read the Call for Papers" : "Browse the archive"}
              <ArrowRightIcon width={18} height={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            {submissionsOpen && (
              <Link
                href="/submit"
                className="border-fg/80 text-fg hover:bg-fg hover:text-bg inline-flex items-center gap-3 rounded-sm border px-6 py-3.5 font-medium transition-colors"
              >
                Submit a manuscript
              </Link>
            )}
          </div>
          {cfp && submissionsOpen && (
            <p className="text-muted mt-10 flex max-w-[40rem] items-start gap-3 text-[0.95rem]" role="status">
              <span className="bg-accent mt-[0.45rem] inline-block size-2 shrink-0 rotate-45" aria-hidden="true" />
              <span>
                Now accepting submissions for <span className="text-fg">{cfp.targetLabel}</span>. Deadline{" "}
                <span className="tabular text-fg">{formatDate(cfp.submissionDeadline)}</span>.
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
