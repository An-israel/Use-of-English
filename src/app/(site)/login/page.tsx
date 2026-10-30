import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { getViewer, safeNext } from "@/lib/auth";
import { getFlags } from "@/lib/data";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const NOTICES: Record<string, string> = {
  link: "That link is invalid or has expired. Please sign in, or request a new link.",
  oauth: "Google sign-in didn’t complete. Please try again or use your email and password.",
};

export default function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getViewer()) redirect(next);
  const flags = await getFlags();
  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to JHTS" intro="Authors, reviewers and editors sign in here.">
      <LoginForm next={next} notice={sp.error ? NOTICES[sp.error] : undefined} google={flags.google_sign_in} />
    </AuthShell>
  );
}
