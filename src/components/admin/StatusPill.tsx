import clsx from "clsx";

const TONE: Record<string, string> = {
  published: "border-brand/40 text-brand",
  in_press: "border-info/40 text-info",
  scheduled: "border-thread text-thread-text",
  draft: "border-rule text-muted",
  unpublished: "border-accent/40 text-accent",
  deleted: "border-accent/40 text-accent",
};

const LABEL: Record<string, string> = {
  published: "Published",
  in_press: "In Press",
  scheduled: "Scheduled",
  draft: "Draft",
  unpublished: "Unpublished",
  deleted: "In the bin",
};

/** Publication state of an issue or article. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "smallcaps inline-block rounded-full border px-2 py-0.5 text-[0.72rem] leading-tight tracking-[0.04em] whitespace-nowrap",
        TONE[status] ?? TONE.draft,
      )}
    >
      {LABEL[status] ?? status}
    </span>
  );
}
