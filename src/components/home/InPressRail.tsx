import { ArticleCard } from "@/components/journal/ArticleCard";
import { Reveal } from "@/components/journal/Reveal";
import type { ArticleSummary, Category } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

export function InPressRail({
  articles,
  categories,
}: {
  articles: ArticleSummary[];
  categories: Map<string, Category>;
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="inpress-title" className="py-20 lg:py-28">
      <div className="max-w-page mx-auto px-4 sm:px-6 lg:px-10">
        <SectionHeading
          eyebrow="Published ahead of issue"
          title="Articles in Press"
          id="inpress-title"
          link={{ href: "/in-press", label: "All articles in press" }}
        >
          Accepted, edited and citable now. Each moves into its issue, with page numbers, when the issue is published.
        </SectionHeading>
      </div>
      <div className="max-w-page mx-auto mt-10">
        {/* Scroll padding matches the padding: otherwise the browser snaps on load, which counts as a scroll and
            stops Chrome measuring Largest Contentful Paint. */}
        <ul
          className="flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:thin] gap-5 overflow-x-auto scroll-smooth px-4 pb-4 sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10"
          aria-label="Articles in press"
        >
          {articles.map((a, i) => (
            <Reveal as="li" index={i} key={a.id} className="w-[85%] shrink-0 snap-start sm:w-[22rem]">
              <ArticleCard
                article={a}
                category={a.categorySlug ? categories.get(a.categorySlug) : undefined}
                meta="online"
              />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
