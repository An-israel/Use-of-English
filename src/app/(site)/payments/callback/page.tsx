import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { PaymentStatus } from "./PaymentStatus";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return (
    <div className="max-w-page mx-auto px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
      <div className="max-w-[36rem]">
        <Suspense fallback={<PageSkeleton />}>
          <Status searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Status({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const reference = (sp.reference ?? sp.trxref ?? "").slice(0, 80);
  if (!/^JHTS-(RF|PF)-[\w-]+$/.test(reference)) {
    return <p className="text-muted">This payment link is incomplete. Please return to your account.</p>;
  }
  return <PaymentStatus reference={reference} />;
}
