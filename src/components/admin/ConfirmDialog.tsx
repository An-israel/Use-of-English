"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Confirmation for anything destructive or public (publish, delete, revoke).
 * Radix handles focus trapping, Escape and returning focus to the trigger.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  tone = "default",
  onConfirm,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "default" | "danger";
  /** Return false to keep the dialog open (e.g. the action failed). */
  onConfirm: () => Promise<boolean | void> | boolean | void;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-[rgb(21_19_15/0.45)] backdrop-blur-[2px]" />
        <Dialog.Content className="bg-surface border-rule fixed top-1/2 left-1/2 z-[91] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[3px] border p-6 shadow-[0_30px_60px_-30px_rgb(21_19_15/0.6)]">
          <Dialog.Title className="font-display text-[1.3rem] leading-snug">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="text-muted mt-2 text-[0.94rem]">{description}</Dialog.Description>
          )}
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button type="button" className="btn-quiet" disabled={busy}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const keep = (await onConfirm()) === false;
                  if (!keep) setOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              className={clsx(tone === "danger" ? "btn-danger" : "btn-primary")}
            >
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
