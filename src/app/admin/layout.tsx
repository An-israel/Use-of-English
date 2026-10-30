import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Toaster } from "@/components/ui/Toaster";
import { requireRole } from "@/lib/auth";
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

async function Guarded({ children }: { children: ReactNode }) {
  const viewer = await requireRole(STAFF_ROLES, "/admin");
  return (
    <Toaster>
      <AdminShell viewer={viewer}>{children}</AdminShell>
    </Toaster>
  );
}
