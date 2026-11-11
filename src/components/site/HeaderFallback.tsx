import { Emblem } from "@/components/brand/Emblem";
import Link from "next/link";

/**
 * Shown for an instant on pages with unknown URLs (e.g. a submission) while the
 * interactive header, which reads the current path, streams in. Same height
 * and wordmark, so nothing shifts.
 */
export function HeaderFallback() {
  return (
    <header className="bg-bg sticky top-0 z-40 border-b border-transparent">
      <div className="max-w-page mx-auto flex h-20 items-center gap-6 px-4 sm:px-6 lg:h-24 lg:px-10">
        <Link href="/" className="mr-auto flex items-center gap-3 leading-none">
          <Emblem title="" wordmark={false} className="size-12 shrink-0 lg:size-16" />
          <span className="flex flex-col">
            <span className="font-display text-brand text-[1.7rem] font-extrabold tracking-[-0.01em] lg:text-[1.95rem]">
              JHTS
            </span>
            <span className="smallcaps text-muted mt-1 hidden text-[0.78rem] sm:block">
              Journal of Humanities and Transcultural Studies
            </span>
          </span>
        </Link>
      </div>
    </header>
  );
}
