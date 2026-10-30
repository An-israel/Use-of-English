import type { ReactNode } from "react";
import { Weave } from "@/components/weave/Weave";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

/** Standard page opening: breadcrumbs, eyebrow, display title, standfirst, a quiet weave. */
export function PageHeader({
  crumbs,
  eyebrow,
  title,
  summary,
  children,
  seed = 5,
  accent,
}: {
  crumbs: Crumb[];
  eyebrow?: string;
  title: ReactNode;
  summary?: ReactNode;
  children?: ReactNode;
  seed?: number;
  /** a thread colour CSS variable for subject pages */
  accent?: string;
}) {
  return (
    <header className="border-rule relative isolate overflow-hidden border-b">
      <Weave
        density="loose"
        colours={[accent ? `var(${accent})` : "var(--thread)"]}
        opacity={accent ? 0.16 : 0.1}
        fade="left"
        className="absolute inset-0 -z-10 h-full w-full"
        seed={seed}
      />
      {accent && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: `var(${accent})` }}
        />
      )}
      <div className="max-w-page mx-auto px-4 pt-8 sm:px-6 lg:px-10">
        <Breadcrumbs items={crumbs} />
      </div>
      <div className="max-w-page mx-auto px-4 pt-10 pb-14 sm:px-6 lg:px-10 lg:pt-14 lg:pb-20">
        {eyebrow && (
          <p className="smallcaps text-[0.85rem]" style={accent ? { color: `var(${accent})` } : undefined}>
            <span className={accent ? "" : "text-muted"}>{eyebrow}</span>
          </p>
        )}
        <h1 className="display-tight font-display mt-4 max-w-[18ch] text-[clamp(2.5rem,1.7rem+3.4vw,4.6rem)]">
          {title}
        </h1>
        {summary && (
          <div className="font-reading text-muted mt-6 max-w-[40rem] text-[1.15rem] leading-relaxed">{summary}</div>
        )}
        {children}
      </div>
    </header>
  );
}
