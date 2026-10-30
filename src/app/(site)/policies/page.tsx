import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/journal/PageHeader";
import { Reveal } from "@/components/journal/Reveal";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getPages } from "@/lib/data";

export const metadata: Metadata = {
  title: "Policies",
  description: "JHTS editorial policies, following the Core Practices of the Committee on Publication Ethics (COPE).",
  alternates: { canonical: "/policies" },
};

export default async function PoliciesPage() {
  const policies = await getPages("policy");
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/about" }, { label: "Policies" }]}
        eyebrow="About the journal"
        title="Policies"
        summary="How JHTS handles ethics, review, authorship, licensing and your data. The policies follow the Core Practices of the Committee on Publication Ethics (COPE)."
        seed={61}
      />
      <ol className="max-w-page mx-auto grid gap-px px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-10 lg:py-16">
        {policies.map((p, i) => (
          <Reveal as="li" index={i} key={p.slug}>
            <Link href={`/policies/${p.slug}`} className="group border-rule flex h-full flex-col border-t py-7 pr-6">
              <span className="tabular font-display text-thread-text text-[0.95rem]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display group-hover:decoration-thread mt-3 text-[1.35rem] leading-snug group-hover:underline group-hover:underline-offset-4">
                {p.title}
              </span>
              {p.summary && <span className="text-muted mt-2 text-[0.92rem]">{p.summary}</span>}
              <ArrowRightIcon
                width={16}
                height={16}
                className="text-brand mt-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        ))}
      </ol>
    </>
  );
}
