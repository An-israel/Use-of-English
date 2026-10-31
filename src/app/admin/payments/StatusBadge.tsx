import clsx from "clsx";
import { PAYMENT_STATUS_LABEL, type PaymentStatus } from "@/lib/finance";

const TONE: Record<PaymentStatus, string> = {
  success: "border-brand/40 text-brand",
  pending: "border-thread text-thread-text",
  failed: "border-accent/40 text-accent",
  abandoned: "border-rule text-muted",
  waived: "border-info/40 text-info",
  refunded: "border-accent/40 text-accent",
};

export function StatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={clsx(
        "smallcaps inline-block rounded-full border px-2 py-0.5 text-[0.72rem] leading-tight tracking-[0.04em] whitespace-nowrap",
        TONE[status],
      )}
    >
      {PAYMENT_STATUS_LABEL[status]}
    </span>
  );
}
