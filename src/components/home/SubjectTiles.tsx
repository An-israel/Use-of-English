import Link from "next/link";
import { Reveal } from "@/components/journal/Reveal";
import type { Category } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

export function SubjectTiles({ categories, counts }: { categories: Category[]; counts: Record<string, number> }) {
  return (
    <section aria-labelledby="subjects-title" className="border-rule bg-surface border-y py-20 lg:py-28">
      <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-10">
        <SectionHeading
          eyebrow="Browse by subject"
          title="Eight threads, one cloth"
          id="subjects-title"
          link={{ href: "/subjects", label: "All subjects" }}
        />
        <ul className="border-rule bg-rule mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-[3px] border lg:grid-cols-4">
          {categories.map((c, i) => {
            const colour = `var(${c.threadColor})`;
            const n = counts[c.slug] ?? 0;
            return (
              <Reveal as="li" index={i} key={c.slug} className="bg-surface">
                <Link
                  href={`/subjects/${c.slug}`}
                  className="group hover:bg-bg relative flex h-full flex-col p-4 transition-colors sm:p-6 lg:min-h-[15rem]"
                >
                  <span
                    aria-hidden="true"
                    className="ease-weave absolute inset-x-0 top-0 h-[3px] origin-left scale-x-[0.18] transition-transform duration-500 group-hover:scale-x-100"
                    style={{ backgroundColor: colour }}
                  />
                  <span className="flex items-center justify-between">
                    <span
                      aria-hidden="true"
                      className="inline-block size-2.5 rotate-45"
                      style={{ backgroundColor: colour }}
                    />
                    <span className="tabular text-muted text-[0.82rem]">
                      {n}
                      <span className="hidden sm:inline"> {n === 1 ? "article" : "articles"}</span>
                    </span>
                  </span>
                  <span className="font-display text-fg mt-5 text-[1.08rem] leading-snug sm:mt-6 sm:text-[1.35rem]">
                    {c.name}
                  </span>
                  <span className="text-muted mt-3 hidden text-[0.9rem] leading-relaxed sm:block">
                    {c.shortDescription}
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
