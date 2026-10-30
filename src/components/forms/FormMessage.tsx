import clsx from "clsx";

/** Form-level feedback announced to screen readers (aria-live). */
export function FormMessage({ status, message }: { status: "idle" | "ok" | "error"; message?: string }) {
  return (
    <div aria-live="polite" role="status" className="min-h-0">
      {message && (
        <p
          className={clsx(
            "rounded-sm border px-4 py-3 text-[0.92rem]",
            status === "error" ? "border-accent/40 bg-accent/5 text-accent" : "border-brand/30 bg-brand/5 text-fg",
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
