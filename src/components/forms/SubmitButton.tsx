"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={clsx(
        "bg-brand text-brand-fg hover:bg-brand-hover inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3.5 font-medium transition-colors disabled:opacity-60",
        className,
      )}
    >
      {pending && (
        <span aria-hidden="true" className="inline-block size-2 rotate-45 animate-spin border border-current" />
      )}
      {pending ? (pendingLabel ?? "Working…") : children}
    </button>
  );
}
