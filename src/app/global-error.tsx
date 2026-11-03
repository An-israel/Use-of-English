"use client";

import { useEffect } from "react";

/** A dropped connection while the page was streaming (B3): retry once by itself. */
const TRANSIENT = /connection closed|failed to fetch|load failed|networkerror|network error|fetch failed/i;
let lastAutoRetry = 0;

// Last-resort error page when the root layout itself fails.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const transient = TRANSIENT.test(error.message ?? "");
  useEffect(() => {
    console.error(error);
    if (transient && Date.now() - lastAutoRetry > 15_000) {
      lastAutoRetry = Date.now();
      const t = setTimeout(retry, 600);
      return () => clearTimeout(t);
    }
  }, [error, retry, transient]);
  return (
    <html lang="en-GB">
      <head>
        <title>{transient ? "Connection interrupted · JHTS" : "Something went wrong · JHTS"}</title>
      </head>
      <body
        style={{
          fontFamily: "Georgia, serif",
          background: "#FAF7EE",
          color: "#1C211D",
          padding: "12vh 24px",
          margin: 0,
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ letterSpacing: "0.1em", fontSize: 13, textTransform: "uppercase", color: "#6A6A5C" }}>
            {transient ? "Connection interrupted" : "Error 500"}
          </p>
          <h1 style={{ fontSize: 48, lineHeight: 1, margin: "16px 0" }}>
            {transient ? "A thread came loose." : "The loom has jammed."}
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: "#6A6A5C" }}>
            {transient
              ? "The page stopped loading part-way, usually because the connection dropped. We are trying again; if nothing happens, press Try again."
              : "Something went wrong on our side. Please try again in a moment."}
          </p>
          {error.digest && <p style={{ fontSize: 14, color: "#6A6A5C" }}>Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              background: "#14452F",
              color: "#FFFDF7",
              border: 0,
              padding: "12px 24px",
              borderRadius: 2,
              fontSize: 16,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
