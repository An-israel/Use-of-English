import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/journal/PageHeader";
import { Reveal } from "@/components/journal/Reveal";
import { ArrowRightIcon } from "@/components/ui/icons";
import { getCategories, getCategoryCounts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Browse by Subject",
  description: "The eight subject areas of the Journal of Humanities and Transcultural Studies.",
  alternates: { canonical: "/subjects" },
};

export default async function SubjectsPage() {
  const [categories, counts] = await Promise.all([getCategories(), getCategoryCounts()]);
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Subjects" }]}
        eyebrow="Browse by subject"
        title="Eight threads, one cloth"
        summary="JHTS publishes across the humanities. Each subject has its own thread colour, used on its articles throughout the site."
        seed={23}
      />
      <ol className="max-w-page mx-auto px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
        {categories.map((c, i) => (
          <Reveal as="li" index={i} key={c.slug} className="border-rule border-t first:border-t-0">
            <Link href={`/subjects/${c.slug}`} className="group grid grid-cols-12 items-baseline gap-x-6 gap-y-2 py-8">
              <span className="col-span-12 flex items-center gap-4 sm:col-span-5">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 shrink-0 rotate-45"
                  style={{ backgroundColor: `var(${c.threadColor})` }}
                />
                <span className="font-display group-hover:decoration-thread text-[clamp(1.4rem,1.2rem+0.8vw,1.9rem)] leading-tight group-hover:underline group-hover:underline-offset-4">
                  {c.name}
                </span>
              </span>
              <span className="text-muted col-span-12 pl-7 sm:col-span-5 sm:pl-0">{c.shortDescription}</span>
              <span className="tabular text-muted col-span-12 flex items-center gap-2 pl-7 text-[0.9rem] sm:col-span-2 sm:justify-end sm:pl-0">
                {counts[c.slug] ?? 0} articles
                <ArrowRightIcon
                  width={16}
                  height={16}
                  className="text-brand transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </ol>
    </>
  );
}
