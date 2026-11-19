"use client";

import { useEffect } from "react";
import { AdminUnavailable } from "@/components/admin/AdminUnavailable";
import { reloadForNewVersion, STALE_DEPLOY } from "@/lib/stale-deploy";

/**
 * The admin when a dependency is unreachable (item 95). Public pages keep
 * serving from cache; the editorial office says plainly that it can't save
 * or load right now, and that nothing has been lost.
 */
export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    // A form loaded before a new deployment: reload once instead of showing an outage.
    if (STALE_DEPLOY.test(error.message ?? "")) reloadForNewVersion();
  }, [error]);
  return <AdminUnavailable digest={error.digest} retry={retry} />;
}
