"use client";

// Last-resort error page when the root layout itself fails.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-GB">
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
            Error 500
          </p>
          <h1 style={{ fontSize: 48, lineHeight: 1, margin: "16px 0" }}>The loom has jammed.</h1>
          <p style={{ fontSize: 19, lineHeight: 1.6, color: "#6A6A5C" }}>
            Something went wrong on our side. Please try again in a moment.
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
