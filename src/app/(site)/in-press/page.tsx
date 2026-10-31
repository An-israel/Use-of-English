import type { Metadata } from "next";
import { ArticleRow } from "@/components/journal/ArticleRow";
import { EmptyState } from "@/components/journal/EmptyState";
import { PageHeader } from "@/components/journal/PageHeader";
import { getCategories, getInPress } from "@/lib/data";

export const metadata: Metadata = {
  title: "Articles in Press",
  description: "Accepted, edited articles published online ahead of their JHTS issue.",
  alternates: { canonical: "/in-press" },
};

export default async function InPressPage() {
  const [articles, categories] = await Promise.all([getInPress(), getCategories()]);
  const byslug = new Map(categories.map((c) => [c.slug, c]));
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Articles in Press" }]}
        eyebrow="Published ahead of issue"
        title="Articles in Press"
        summary="These articles have been accepted, paid for, copy-edited and typeset. They are final and citable now, and each moves into its issue, with page numbers, when the issue is published."
        seed={17}
      />
      <div className="max-w-page mx-auto px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {/* The list's heading, so article titles (h3) sit under an h2. */}
        <h2 className="tabular text-muted mb-6 text-[0.9rem] font-normal">
          {articles.length} {articles.length === 1 ? "article" : "articles"}, newest first
        </h2>
        {articles.length === 0 ? (
          <EmptyState title="Nothing in press right now">
            New articles appear here as soon as they are ready, ahead of their issue.
          </EmptyState>
        ) : (
          <div className="border-fg border-t">
            {articles.map((a) => (
              <ArticleRow
                key={a.id}
                article={a}
                category={a.categorySlug ? byslug.get(a.categorySlug) : undefined}
                showOnlineDate
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
