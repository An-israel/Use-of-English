import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Toaster } from "@/components/ui/Toaster";
import { AdminUnavailable } from "@/components/admin/AdminUnavailable";
import { requireRole, ServiceUnavailableError } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/workflow";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · JHTCS admin" },
  robots: { index: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="text-muted p-10">Loading…</div>}>
      <Guarded>{children}</Guarded>
    </Suspense>
  );
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
  return (
    <Toaster>
      <AdminShell viewer={viewer}>{children}</AdminShell>
    </Toaster>
  );
}
