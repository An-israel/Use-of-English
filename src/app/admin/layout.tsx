import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Toaster } from "@/components/ui/Toaster";
import { AdminUnavailable } from "@/components/admin/AdminUnavailable";
import { requireRole, ServiceUnavailableError } from "@/lib/auth";
import { isPaymentTestMode } from "@/lib/payments/paystack";
import { STAFF_ROLES } from "@/lib/workflow";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · JHTS admin" },
  robots: { index: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="text-muted p-10">Loading…</div>}>
      <Guarded>{children}</Guarded>
    </Suspense>
  );
}

function testMode(): boolean {
  try {
    return isPaymentTestMode();
  } catch {
    return true;
  }
}

async function Guarded({ children }: { children: ReactNode }) {
  let viewer;
  try {
    viewer = await requireRole(STAFF_ROLES, "/admin");
  } catch (e) {
    // The layout sits outside admin/error.tsx, so an outage while checking the role is handled here.
    if (!(e instanceof ServiceUnavailableError)) throw e;
    console.error(e);
    return (
      <main id="main" className="bg-bg min-h-screen">
        <AdminUnavailable />
      </main>
    );
  }
  const banner = testMode() ? (
    <p
      role="note"
      className="border-thread text-thread-text border-b bg-[color-mix(in_oklab,var(--thread)_10%,var(--bg))] px-5 py-2 text-[0.82rem] lg:px-10"
    >
      <strong className="smallcaps tracking-[0.08em]">Test mode</strong> · Payments use Paystack test keys or the local
      simulator; no real money moves.
    </p>
  ) : null;
  return (
    <Toaster>
      <AdminShell viewer={viewer} banner={banner}>
        {children}
      </AdminShell>
    </Toaster>
  );
}
