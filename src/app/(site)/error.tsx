"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="max-w-page mx-auto grid grid-cols-12 gap-6 px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <div className="col-span-12 md:col-span-7">
        <p className="smallcaps text-muted text-[0.85rem]">Error 500</p>
        <h1 className="display-tight font-display mt-5 text-[clamp(2.5rem,1.8rem+3.5vw,4.5rem)]">
          The loom has jammed.
        </h1>
        <p className="font-reading text-muted mt-6 max-w-[32rem] text-[1.2rem] leading-relaxed">
          Something went wrong on our side. The editorial office has been notified. Please try again in a moment.
        </p>
        {error.digest && (
          <p className="tabular text-muted mt-4 text-[0.85rem]">
            Reference: <code>{error.digest}</code>
          </p>
        )}
        <div className="mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => retry()}
            className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3 font-medium"
          >
            Try again
          </button>
          <Link href="/" className="border-fg/80 hover:bg-fg hover:text-bg rounded-sm border px-6 py-3 font-medium">
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
