import type { MetadataRoute } from "next";
import { getArticles, getCategories, getInPress, getIssues, getPages } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { issuePath } from "@/lib/issues";

const STATIC = [
  "/",
  "/issues",
  "/in-press",
  "/book-reviews",
  "/subjects",
  "/search",
  "/about",
  "/aims-and-scope",
  "/use-of-english-unit",
  "/editorial-board",
  "/call-for-papers",
  "/author-guidelines",
  "/fees",
  "/faq",
  "/policies",
  "/contact",
];

/** Every public page, issue, article, subject and policy (brief section 12). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [issues, articles, inPress, categories, policies] = await Promise.all([
    getIssues(),
    getArticles(),
    getInPress(),
    getCategories(),
    getPages("policy"),
  ]);
  const seen = new Set<string>();
  const arts = [...articles, ...inPress].filter((a) => !seen.has(a.slug) && seen.add(a.slug));
  return [
    ...STATIC.map((p) => ({
      url: `${siteUrl}${p === "/" ? "" : p}`,
      changeFrequency: "weekly" as const,
      priority: p === "/" ? 1 : 0.6,
    })),
    ...issues.map((i) => ({
      url: `${siteUrl}${issuePath(i)}`,
      lastModified: i.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...arts.map((a) => ({
      url: `${siteUrl}/articles/${a.slug}`,
      lastModified: a.publishedAt ?? a.onlineAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...categories.map((c) => ({
      url: `${siteUrl}/subjects/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...policies.map((p) => ({
      url: `${siteUrl}/policies/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}
