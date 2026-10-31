import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/journal/PageHeader";
import { PageSkeleton } from "@/components/journal/Skeleton";
import { getArticles, getCategories, getSlugRedirect } from "@/lib/data";
import { SubjectArticles } from "./SubjectArticles";
import { atLeastOne } from "@/lib/static-params";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  return atLeastOne(
    (await getCategories()).map((c) => ({ slug: c.slug })),
    { slug: "none" },
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const c = (await getCategories()).find((x) => x.slug === slug);
  if (!c) return { title: "Subject not found" };
  return { title: c.name, description: c.shortDescription, alternates: { canonical: `/subjects/${c.slug}` } };
}

export default function SubjectPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SubjectContent params={params} />
    </Suspense>
  );
}

async function SubjectContent({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [categories, articles] = await Promise.all([getCategories(), getArticles()]);
  const category = categories.find((c) => c.slug === slug);
  if (!category) {
    const moved = await getSlugRedirect("category", slug);
    if (moved) permanentRedirect(`/subjects/${moved}`);
    notFound();
  }
  const inCategory = articles.filter((a) => a.categorySlug === category.slug);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Subjects", href: "/subjects" }, { label: category.name }]}
        eyebrow="Subject"
        title={category.name}
        summary={category.description}
        accent={category.threadColor}
        seed={category.sortOrder * 7}
      />
      <div className="max-w-page mx-auto px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <SubjectArticles articles={inCategory} category={category} />
      </div>
    </>
  );
}
