"use client";

import { useEffect } from "react";

/** Counts one view of this article per browser session (the server de-duplicates per day too). */
export function ViewBeacon({ articleId }: { articleId: string }) {
  useEffect(() => {
    const key = `jhts-viewed:${articleId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage unavailable: the server's daily de-duplication still applies
    }
    void fetch("/api/metrics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ article: articleId }),
      keepalive: true,
    }).catch(() => {});
  }, [articleId]);
  return null;
}
