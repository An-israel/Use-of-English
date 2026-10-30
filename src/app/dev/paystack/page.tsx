import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatNaira } from "@/lib/format";
import { mockOutcome } from "./actions";

export const metadata = { title: "Simulated checkout", robots: { index: false } };

/** Local stand-in for Paystack Checkout (PAYSTACK_MODE=mock only; never in production). */
export default function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <Suspense>
      <Checkout searchParams={searchParams} />
    </Suspense>
  );
}

async function Checkout({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.PAYSTACK_MODE !== "mock" || process.env.VERCEL_ENV === "production") notFound();
  const sp = await searchParams;
  const reference = sp.reference ?? "";
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="smallcaps text-accent text-[0.8rem]">Test mode · simulated checkout</p>
      <h1 className="font-display mt-3 text-[2rem]">Pay {formatNaira(Number(sp.amount ?? 0))}</h1>
      <p className="tabular text-muted mt-2 text-[0.9rem]">Reference {reference}</p>
      <p className="text-muted mt-6 text-[0.95rem]">
        This page stands in for Paystack until the journal’s test keys are configured. No money moves. Choosing an
        outcome sends a signed webhook exactly as Paystack would.
      </p>
      <form action={mockOutcome} className="mt-8 flex flex-col gap-3">
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="callback" value={sp.callback ?? "/payments/callback"} />
        <button
          name="outcome"
          value="success"
          className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3.5 font-medium"
        >
          Simulate successful payment
        </button>
        <button
          name="outcome"
          value="failed"
          className="border-fg/70 hover:bg-fg hover:text-bg rounded-sm border px-6 py-3.5 font-medium"
        >
          Simulate failed payment
        </button>
      </form>
    </main>
  );
}
