import type { Metadata } from "next";
import { ArchiveBrowser, type ArchiveIssue } from "@/components/archive/ArchiveBrowser";
import { PageHeader } from "@/components/journal/PageHeader";
import { getArticles, getCategories, getIssues } from "@/lib/data";

export const metadata: Metadata = {
  title: "All Issues",
  description: "Every volume and issue of the Journal of Humanities and Transcultural Studies, newest first.",
  alternates: { canonical: "/issues" },
};

export default async function AllIssuesPage() {
  const [issues, articles, categories] = await Promise.all([getIssues(), getArticles(), getCategories()]);
  const archive: ArchiveIssue[] = issues.map((i) => {
    const inIssue = articles.filter((a) => a.issue?.volume === i.volume && a.issue.number === i.number);
    return {
      ...i,
      articleCount: inIssue.length,
      categories: [...new Set(inIssue.map((a) => a.categorySlug).filter((s): s is string => !!s))],
    };
  });
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "All issues" }]}
        eyebrow="The archive"
        title="All Issues"
        summary="JHTS publishes one volume a year in four quarterly issues: March, June, September and December."
        seed={13}
      />
      <ArchiveBrowser issues={archive} categories={categories} />
    </>
  );
}
