"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reloadForNewVersion, STALE_DEPLOY } from "@/lib/stale-deploy";

/** A dropped connection while the page was streaming, not a fault on the server (B3). */
const TRANSIENT = /connection closed|failed to fetch|load failed|networkerror|network error|fetch failed/i;
// One automatic retry at a time, so a real outage can't loop.
let lastAutoRetry = 0;

export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const stale = STALE_DEPLOY.test(error.message ?? "");
  const transient = stale || TRANSIENT.test(error.message ?? "");
  useEffect(() => {
    console.error(error);
    if (stale && reloadForNewVersion()) return;
    if (transient && Date.now() - lastAutoRetry > 15_000) {
      lastAutoRetry = Date.now();
      const t = setTimeout(retry, 600);
      return () => clearTimeout(t);
    }
  }, [error, retry, transient, stale]);

  return (
    <section className="max-w-page mx-auto grid grid-cols-12 gap-6 px-4 py-24 sm:px-6 lg:px-10 lg:py-36">
      <div className="col-span-12 md:col-span-7">
        <p className="smallcaps text-muted text-[0.85rem]">
          {stale ? "Just updated" : transient ? "Connection interrupted" : "Error 500"}
        </p>
        <h1 className="display-tight font-display mt-5 text-[clamp(2.5rem,1.8rem+3.5vw,4.5rem)]">
          {stale ? "A new thread on the loom." : transient ? "A thread came loose." : "The loom has jammed."}
        </h1>
        <p className="font-reading text-muted mt-6 max-w-[32rem] text-[1.2rem] leading-relaxed">
          {stale
            ? "The site was updated while this page was open. We are reloading it; if nothing happens, press Try again."
            : transient
              ? "The page stopped loading part-way, usually because the connection dropped. We are trying again; if nothing happens, press Try again."
              : "Something went wrong on our side. The editorial office has been notified. Please try again in a moment."}
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
