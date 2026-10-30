import Link from "next/link";
import { getCallForPapers, getCurrentIssue, getFlags, getSettings } from "@/lib/data";
import { NAV } from "@/lib/nav";
import { issueLabel, issuePath } from "@/lib/issues";
import { formatDate } from "@/lib/format";
import { IssueCover } from "@/components/weave/IssueCover";
import { ArrowRightIcon } from "@/components/ui/icons";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const [settings, flags, issue, cfp] = await Promise.all([
    getSettings(),
    getFlags(),
    getCurrentIssue(),
    getCallForPapers(),
  ]);

  const features = {
    journal: issue ? (
      <Link href={issuePath(issue)} className="group grid grid-cols-[7rem_1fr] items-start gap-6">
        <IssueCover
          volume={issue.volume}
          issue={issue.number}
          month={issue.month}
          year={issue.year}
          coverUrl={issue.coverUrl}
          className="w-28 shadow-[0_12px_24px_-16px_rgb(21_19_15/0.6)]"
        />
        <span>
          <span className="smallcaps text-muted block text-[0.78rem]">Current issue</span>
          <span className="font-display text-fg mt-2 block text-[1.35rem] leading-snug">{issueLabel(issue)}</span>
          <span className="text-muted mt-2 block text-[0.9rem]">{issue.articles.length} articles</span>
          <span className="text-brand mt-4 inline-flex items-center gap-2 text-[0.92rem] group-hover:underline">
            Read the issue <ArrowRightIcon width={16} height={16} />
          </span>
        </span>
      </Link>
    ) : null,
    about: (
      <figure>
        <blockquote className="font-display text-fg text-[1.35rem] leading-snug italic">
          “A platform for original research across the humanities, and for ideas that cross borders.”
        </blockquote>
        <figcaption className="text-muted mt-4 text-[0.9rem]">Published by the {settings.publisherShort}.</figcaption>
        <Link
          href="/editorial-board"
          className="text-brand mt-5 inline-flex items-center gap-2 text-[0.92rem] hover:underline"
        >
          Meet the editorial board <ArrowRightIcon width={16} height={16} />
        </Link>
      </figure>
    ),
    authors: cfp ? (
      <div>
        <span className="smallcaps text-muted block text-[0.78rem]">Call for papers</span>
        <p className="font-display text-fg mt-2 text-[1.35rem] leading-snug">{cfp.targetLabel}</p>
        <p className="text-muted mt-2 text-[0.92rem]">
          Deadline <span className="tabular text-fg">{formatDate(cfp.submissionDeadline)}</span>
        </p>
        <Link
          href="/call-for-papers"
          className="text-brand mt-5 inline-flex items-center gap-2 text-[0.92rem] hover:underline"
        >
          Read the call <ArrowRightIcon width={16} height={16} />
        </Link>
      </div>
    ) : null,
  };

  return (
    <HeaderClient
      nav={NAV}
      features={features}
      journalName={settings.journalName}
      shortName={settings.shortName}
      submissionsOpen={flags.submissions_open}
    />
  );
}
