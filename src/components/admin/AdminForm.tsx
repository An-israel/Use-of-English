"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import clsx from "clsx";
import { useToast } from "@/components/ui/Toaster";
import type { ActionResult } from "@/lib/admin/server";
import { useRowVersion } from "./RowVersion";

/** Warn before leaving with unsaved changes: closing the tab or following a link. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || a.href.startsWith("blob:")) return;
      if (a.href.split("#")[0] === location.href.split("#")[0]) return;
      if (!window.confirm("You have unsaved changes. Leave this page and lose them?")) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
}

/**
 * A form posting to an admin server action. It tracks unsaved changes, shows
 * the result as a toast, keeps conflict messages on screen (with a reload
 * button) and refreshes the page data after a successful save.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Save changes",
  className,
  footer,
  onSaved,
  resetOnSave,
  guard = true,
}: {
  action: (form: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  footer?: ReactNode;
  onSaved?: (r: ActionResult) => void;
  resetOnSave?: boolean;
  guard?: boolean;
}) {
  const [dirty, setDirty] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const router = useRouter();
  const row = useRowVersion();
  useUnsavedChanges(guard && dirty);

  // Rich-text editors write to hidden inputs, which fire no input event.
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    const obs = new MutationObserver(() => setDirty(true));
    form
      .querySelectorAll(".ProseMirror")
      .forEach((n) => obs.observe(n, { childList: true, subtree: true, characterData: true }));
    return () => obs.disconnect();
  });

  return (
    <form
      ref={ref}
      className={clsx("space-y-5", className)}
      onInput={() => setDirty(true)}
      onChange={() => setDirty(true)}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (row && data.has("version")) data.set("version", String(row.version));
        start(async () => {
          const r = await action(data);
          if (r.ok && row && r.version) row.setVersion(r.version);
          setResult(r);
          if (r.ok) {
            setDirty(false);
            toast(r.message);
            if (resetOnSave) ref.current?.reset();
            onSaved?.(r);
            router.refresh();
          } else if (!r.conflict) {
            toast(r.message, "error");
          }
        });
      }}
    >
      {children}
      {result && !result.ok && (
        <div
          role="alert"
          className={clsx(
            "rounded-[2px] border px-4 py-3 text-[0.9rem]",
            result.conflict
              ? "border-thread bg-[color-mix(in_oklab,var(--thread)_10%,transparent)]"
              : "border-accent text-accent",
          )}
        >
          {result.message}
          {result.conflict && (
            <button
              type="button"
              onClick={() => {
                // Drop the unsaved-changes guard first, or the browser asks before reloading.
                setDirty(false);
                setTimeout(() => location.reload(), 50);
              }}
              className="ml-3 font-medium underline underline-offset-4"
            >
              Reload now
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {dirty && !pending && <span className="text-muted text-[0.82rem]">Unsaved changes</span>}
        {footer}
      </div>
    </form>
  );
}

/** Small labelled inputs for dense admin forms. */
export function AField({
  label,
  hint,
  className,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return (
    <label className={clsx("admin-label", className)}>
      {label}
      <input className="admin-input" {...input} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function AText({
  label,
  hint,
  className,
  ...input
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: ReactNode }) {
  return (
    <label className={clsx("admin-label", className)}>
      {label}
      <textarea className="admin-input" rows={4} {...input} />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function ASelect({
  label,
  hint,
  className,
  options,
  ...input
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: ReactNode;
  options: { value: string; label: string }[];
}) {
  return (
    <label className={clsx("admin-label", className)}>
      {label}
      <select className="admin-input" {...input}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export function ACheck({
  label,
  className,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={clsx("flex items-center gap-2.5 text-[0.9rem]", className)}>
      <input type="checkbox" className="size-4 accent-[var(--brand)]" {...input} />
      {label}
    </label>
  );
}
