"use client";

import Link from "next/link";

/** "The editorial office can't reach the database", shared by the admin error boundary and layout. */
export function AdminUnavailable({ digest, retry }: { digest?: string; retry?: () => void }) {
  return (
    <div className="px-5 py-16 lg:px-10">
      <div className="admin-box border-l-accent max-w-[40rem] border-l-2">
        <p className="smallcaps text-accent text-[0.78rem]">Service unavailable</p>
        <h1 className="font-display mt-2 text-[1.8rem] leading-tight">The editorial office can’t reach the database</h1>
        <p className="text-muted mt-3 text-[0.95rem]">
          This page couldn’t load, usually because the database or file storage is briefly unavailable. Nothing you
          saved earlier has been lost, and the public site keeps serving published pages. Try again in a minute; if it
          continues, check the System screen or the status pages listed in the runbook.
        </p>
        {digest && (
          <p className="tabular text-muted mt-3 text-[0.82rem]">
            Reference: <code>{digest}</code>
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn-primary" onClick={() => (retry ? retry() : window.location.reload())}>
            Try again
          </button>
          <Link href="/api/health" className="btn-line" prefetch={false}>
            Check service health
          </Link>
        </div>
      </div>
    </div>
  );
}
