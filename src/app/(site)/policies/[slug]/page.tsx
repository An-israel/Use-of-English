import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/journal/PageHeader";
import { ProseBody } from "@/components/journal/ProseBody";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { getPage, getPages, getSlugRedirect } from "@/lib/data";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return (await getPages("policy")).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPage("policy", slug);
  if (!p) return { title: "Policy not found" };
  return { title: p.title, description: p.summary ?? undefined, alternates: { canonical: `/policies/${p.slug}` } };
}

export default function PolicyPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PolicyContent params={params} />
    </Suspense>
  );
}

async function PolicyContent({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [page, all] = await Promise.all([getPage("policy", slug), getPages("policy")]);
  if (!page) {
    const moved = await getSlugRedirect("page", slug);
    if (moved) permanentRedirect(`/policies/${moved}`);
    notFound();
  }
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Policies", href: "/policies" }, { label: page.title }]}
        eyebrow="Policy"
        title={page.title}
        summary={page.summary}
        seed={page.sortOrder * 5 + 3}
      />
      <ProseBody
        html={page.bodyHtml}
        updatedAt={page.updatedAt}
        aside={
          <nav aria-label="All policies" className="lg:sticky lg:top-24">
            <p className="smallcaps text-muted text-[0.78rem]">All policies</p>
            <ul className="mt-3 space-y-2 text-[0.9rem]">
              {all.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/policies/${p.slug}`}
                    aria-current={p.slug === page.slug ? "page" : undefined}
                    className={
                      p.slug === page.slug
                        ? "text-fg decoration-thread underline underline-offset-4"
                        : "text-muted hover:text-fg"
                    }
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        }
      />
    </>
  );
}
