import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { requireViewer } from "@/lib/auth";
import { ROLE_LABEL, STAFF_ROLES } from "@/lib/workflow";

export const metadata: Metadata = { title: "Welcome to JHTS", robots: { index: false } };

/** Where invitation links land: choose a password and confirm name and affiliation. */
export default function WelcomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const viewer = await requireViewer("/account/welcome");
  const next = STAFF_ROLES.includes(viewer.role) ? "/admin" : "/account";
  return (
    <AuthShell
      eyebrow={`Invitation · ${ROLE_LABEL[viewer.role]}`}
      title="Welcome to JHTS"
      intro="You have joined the journal’s website. Confirm your details and choose a password to finish setting up your account."
    >
      <SetPasswordForm
        next={next}
        withProfile
        defaults={{ fullName: viewer.fullName, affiliation: viewer.affiliation ?? "" }}
      />
    </AuthShell>
  );
}
