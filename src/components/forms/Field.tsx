import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

/** Labelled input with hint and inline error, wired up for screen readers. */
export function Field({
  label,
  error,
  hint,
  className,
  trailing,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: ReactNode; trailing?: ReactNode }) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.92rem]">
          {label}
        </label>
        {trailing}
      </div>
      <input
        id={id}
        {...input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={clsx(
          "bg-surface text-fg placeholder:text-muted/70 focus-visible:outline-thread mt-1.5 w-full rounded-sm border px-3.5 py-3 transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
          error ? "border-accent" : "border-rule hover:border-fg/40 focus:border-fg",
        )}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-muted mt-1.5 text-[0.82rem]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-accent mt-1.5 text-[0.85rem]">
          {error}
        </p>
      )}
    </div>
  );
}
