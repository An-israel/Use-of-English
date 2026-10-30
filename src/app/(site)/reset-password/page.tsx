import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Reset />
    </Suspense>
  );
}

async function Reset() {
  // The reset link signs the person in for this step; without a session the link has expired.
  await requireViewer("/reset-password");
  return (
    <AuthShell eyebrow="Account" title="Choose a new password">
      <SetPasswordForm next="/account?password=updated" />
    </AuthShell>
  );
}
