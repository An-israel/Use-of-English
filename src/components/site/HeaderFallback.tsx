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
        <Link href="/" className="mr-auto flex flex-col leading-none">
          <span className="font-display text-[1.85rem] font-semibold tracking-[-0.02em] lg:text-[2.1rem]">JHTS</span>
          <span className="smallcaps text-muted mt-1 hidden text-[0.78rem] sm:block">
            Journal of Humanities and Transcultural Studies
          </span>
        </Link>
      </div>
    </header>
  );
}
