import { Suspense, type ReactNode } from "react";
import { HeaderFallback } from "@/components/site/HeaderFallback";
import { CommandPalette, type PaletteItem } from "@/components/site/CommandPalette";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Toaster } from "@/components/ui/Toaster";
import { getArticles, getCategories, getIssues, getPages } from "@/lib/data";
import { issueLabel, issuePath } from "@/lib/issues";
import { NAV } from "@/lib/nav";

async function paletteIndex(): Promise<PaletteItem[]> {
  "use cache";
  const [articles, issues, pages, policies, categories] = await Promise.all([
    getArticles(),
    getIssues(),
    getPages("page"),
    getPages("policy"),
    getCategories(),
  ]);

  const authors = new Map<string, { count: number; affiliation: string | null }>();
  for (const a of articles) {
    for (const au of a.authors) {
      const prev = authors.get(au.name);
      authors.set(au.name, { count: (prev?.count ?? 0) + 1, affiliation: prev?.affiliation ?? au.affiliation });
    }
  }

  return [
    ...articles.map((a): PaletteItem => ({
      group: "Articles",
      title: a.title,
      hint: a.authors.map((x) => x.name).join(", "),
      href: `/articles/${a.slug}`,
      terms: a.abstract.slice(0, 200),
    })),
    ...issues.map((i): PaletteItem => ({ group: "Issues", title: issueLabel(i), href: issuePath(i) })),
    ...[...authors].map(([name, v]): PaletteItem => ({
      group: "Authors",
      title: name,
      hint: `${v.count} ${v.count === 1 ? "article" : "articles"}${v.affiliation ? ` · ${v.affiliation}` : ""}`,
      href: `/search?author=${encodeURIComponent(name)}`,
    })),
    ...NAV.flatMap((g) =>
      g.links.map((l): PaletteItem => ({ group: "Pages", title: l.label, hint: l.description, href: l.href })),
    ),
    ...pages
      .filter((p) => !NAV.some((g) => g.links.some((l) => l.href === `/${p.slug}`)))
      .map((p): PaletteItem => ({ group: "Pages", title: p.title, hint: p.summary ?? undefined, href: `/${p.slug}` })),
    ...policies.map((p): PaletteItem => ({
      group: "Pages",
      title: p.title,
      hint: "Policy",
      href: `/policies/${p.slug}`,
    })),
    ...categories.map((c): PaletteItem => ({
      group: "Pages",
      title: c.name,
      hint: "Subject area",
      href: `/subjects/${c.slug}`,
    })),
  ];
}

/** Header, footer, skip link and search palette around every public page. */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const items = await paletteIndex();
  return (
    <Toaster>
      <a
        href="#main"
        className="bg-brand text-brand-fg fixed top-3 left-4 z-[70] -translate-y-24 rounded-sm px-4 py-2 transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Suspense fallback={<HeaderFallback />}>
        <Header />
      </Suspense>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <CommandPalette items={items} />
    </Toaster>
  );
}
