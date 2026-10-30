import clsx from "clsx";
import { STATUS_LABEL, TIMELINE, timelinePosition, type SubmissionStatus } from "@/lib/workflow";

const SHORT: Partial<Record<SubmissionStatus, string>> = {
  submitted: "Submitted",
  under_screening: "Screening",
  plagiarism_check: "Similarity check",
  under_peer_review: "Peer review",
  accepted_awaiting_fee: "Accepted",
  in_production: "Production",
  published: "Published",
};

/** The main path a manuscript takes, with the current step marked. */
export function StatusTimeline({ status, feesEnabled = true }: { status: SubmissionStatus; feesEnabled?: boolean }) {
  if (status === "rejected" || status === "withdrawn") {
    return <p className="text-muted text-[0.9rem]">This submission is closed: {STATUS_LABEL[status].toLowerCase()}.</p>;
  }
  const steps = TIMELINE;
  const at = timelinePosition(status);
  const pre = status === "draft" || status === "awaiting_review_fee";
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label={`Progress: ${STATUS_LABEL[status]}`}>
      {steps.map((s, i) => {
        const done = !pre && i < at;
        const current = !pre && i === at;
        const label = s === "accepted_awaiting_fee" && !feesEnabled ? "Accepted" : SHORT[s];
        return (
          <li key={s} className="min-w-0" aria-current={current ? "step" : undefined}>
            <span className={clsx("block h-1 rounded-full", done ? "bg-brand" : current ? "bg-thread" : "bg-rule")} />
            <span className={clsx("mt-2 hidden truncate text-[0.72rem] sm:block", current ? "text-fg" : "text-muted")}>
              {label}
            </span>
            <span className="sr-only">
              {label}: {done ? "done" : current ? "current" : "to come"}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
