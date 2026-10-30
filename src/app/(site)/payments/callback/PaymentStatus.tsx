"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type S = { status: string; submission_id?: string; receipt_number?: string | null; fee_type?: string } | null;

/**
 * Shows the outcome after Paystack. It never marks anything paid: it polls the
 * server, which learns the truth from the signed webhook.
 */
export function PaymentStatus({ reference }: { reference: string }) {
  const [data, setData] = useState<S>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let stop = false;
    let tries = 0;
    const tick = async () => {
      tries++;
      try {
        const res = await fetch(`/api/payments/${encodeURIComponent(reference)}/status`, { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          setData(d);
          if (d.status !== "pending") return;
        }
      } catch {
        // network blip: keep polling
      }
      if (tries >= 30) setGaveUp(true);
      else if (!stop) setTimeout(tick, 2000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [reference]);

  const back = data?.submission_id ? `/account/submissions/${data.submission_id}` : "/account";

  if (data?.status === "success") {
    return (
      <div role="status" aria-live="polite">
        <span aria-hidden="true" className="bg-brand inline-block size-3 rotate-45" />
        <h1 className="font-display mt-5 text-[clamp(2rem,1.6rem+1.6vw,2.8rem)]">Payment received</h1>
        <p className="text-muted mt-3">
          Thank you. Your receipt{data.receipt_number ? ` (${data.receipt_number})` : ""} is on its way by email and is
          available on your submission page.
        </p>
        <Link
          href={back}
          className="bg-brand text-brand-fg hover:bg-brand-hover mt-8 inline-block rounded-sm px-6 py-3.5 font-medium"
        >
          View your submission
        </Link>
      </div>
    );
  }
  if (data && data.status !== "pending") {
    return (
      <div role="status" aria-live="polite">
        <h1 className="font-display text-[clamp(2rem,1.6rem+1.6vw,2.8rem)]">Payment not completed</h1>
        <p className="text-muted mt-3">No money was taken. You can try again from your submission page.</p>
        <Link
          href={back}
          className="bg-brand text-brand-fg hover:bg-brand-hover mt-8 inline-block rounded-sm px-6 py-3.5 font-medium"
        >
          Return to your submission
        </Link>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite">
      <span aria-hidden="true" className="border-thread inline-block size-3 rotate-45 animate-spin border" />
      <h1 className="font-display mt-5 text-[clamp(2rem,1.6rem+1.6vw,2.8rem)]">Confirming your payment…</h1>
      <p className="text-muted mt-3">
        {gaveUp
          ? "Paystack has not confirmed this payment yet. If you completed it, it will appear on your submission page shortly; you will not be charged twice."
          : "This usually takes a few seconds. Please keep this page open."}
      </p>
      {gaveUp && (
        <Link
          href={back}
          className="border-fg/70 hover:bg-fg hover:text-bg mt-8 inline-block rounded-sm border px-6 py-3.5 font-medium"
        >
          Go to your submission
        </Link>
      )}
      <p className="tabular text-muted mt-6 text-[0.85rem]">Reference {reference}</p>
    </div>
  );
}
