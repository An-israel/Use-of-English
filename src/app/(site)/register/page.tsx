import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { getViewer, safeNext } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an author account", robots: { index: false } };

export default function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Register searchParams={searchParams} />
    </Suspense>
  );
}

async function Register({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const next = safeNext((await searchParams).next);
  if (await getViewer()) redirect(next);
  return (
    <AuthShell
      eyebrow="For authors"
      title="Create an author account"
      intro="You need an account to submit a manuscript, pay fees and follow your submission through review."
      aside={
        <ol className="space-y-5">
          {[
            "Create your account and confirm your email",
            "Submit your manuscript and pay the review fee",
            "Follow screening, review and decisions from your dashboard",
          ].map((s, i) => (
            <li key={s} className="flex gap-4">
              <span className="tabular font-display text-[1.4rem] text-[#E1B521]">0{i + 1}</span>
              <span className="pt-1 text-[1.05rem] leading-snug">{s}</span>
            </li>
          ))}
        </ol>
      }
    >
      <RegisterForm next={next} />
    </AuthShell>
  );
}
