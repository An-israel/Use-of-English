import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/journal/PageHeader";

export const metadata: Metadata = { title: "Account deleted", robots: { index: false } };

/** Shown after someone deletes their account (I4). */
export default function GoodbyePage() {
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Account deleted" }]}
        eyebrow="Your account"
        title="Your account has been deleted"
        summary="Thank you for being part of JHTS. Published articles stay in the journal’s record; everything else that identified you has been removed."
        seed={71}
      />
      <div className="max-w-page mx-auto px-4 py-14 sm:px-6 lg:px-10">
        <Link href="/" className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3 font-medium">
          Return home
        </Link>
      </div>
    </>
  );
}
