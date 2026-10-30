"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import clsx from "clsx";
import { useToast } from "@/components/ui/Toaster";
import type { ActionResult } from "@/lib/admin/server";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * A button that runs one server action, shows the result as a toast and
 * refreshes the page. With `confirm`, a dialog asks first.
 */
export function ActionButton({
  run,
  children,
  variant = "line",
  confirm,
  redirectTo,
  reload,
  className,
}: {
  run: () => Promise<ActionResult>;
  children: ReactNode;
  variant?: "primary" | "line" | "quiet" | "danger";
  confirm?: { title: string; description?: ReactNode; confirmLabel: string; tone?: "default" | "danger" };
  /** Navigate here on success; `{id}` is replaced with the result's id. */
  redirectTo?: string;
  /** Reload the whole page on success (when open editors must pick up new content). */
  reload?: boolean;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const go = async () => {
    const r = await run();
    toast(r.message, r.ok ? "info" : "error");
    if (r.ok) {
      if (redirectTo) router.push(redirectTo.replace("{id}", r.id ?? ""));
      else if (reload) setTimeout(() => location.reload(), 600);
      else router.refresh();
    }
    return r.ok;
  };
  const cls = clsx(`btn-${variant}`, className);
  if (confirm) {
    return (
      <ConfirmDialog
        {...confirm}
        trigger={
          <button type="button" className={cls}>
            {children}
          </button>
        }
        onConfirm={async () => {
          // Close either way: the toast (above the page, not the dialog) reports the outcome.
          await go();
        }}
      />
    );
  }
  return (
    <button type="button" className={cls} disabled={pending} onClick={() => start(async () => void (await go()))}>
      {pending ? "Working…" : children}
    </button>
  );
}
