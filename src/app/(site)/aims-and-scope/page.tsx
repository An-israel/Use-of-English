import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { ProseBody } from "@/components/journal/ProseBody";
import { getCategories, getPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Aims and Scope",
  description: "The subject areas, article types and contributors JHTS publishes.",
  alternates: { canonical: "/aims-and-scope" },
};

const TYPES = [
  ["Research articles", "Original studies based on analysis of texts, data, fieldwork or archives."],
  ["Theoretical papers", "Arguments that develop, test or revise concepts and frameworks in the humanities."],
  ["Critical reviews", "Critical surveys of a body of work, a debate or a tradition."],
  ["Book reviews", "Assessments of recently published books, commissioned by the Book Review Editors."],
];

export default async function AimsPage() {
  const [page, categories] = await Promise.all([getPage("page", "aims-and-scope"), getCategories()]);
  if (!page) notFound();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/about" }, { label: page.title }]}
        eyebrow="About the journal"
        title={page.title}
        summary={page.summary}
        seed={43}
      />
      <ProseBody
        html={page.bodyHtml}
        toc={false}
        after={
          <div className="mt-16 space-y-16">
            <section aria-labelledby="areas">
              <h2 id="areas" className="font-display text-[1.65rem]">
                Subject areas
              </h2>
              <ol className="border-rule mt-6 border-t">
                {categories.map((c, i) => (
                  <li key={c.slug} className="border-rule grid grid-cols-[2.25rem_1fr] gap-x-3 border-b py-5">
                    <span className="tabular font-display text-muted pt-1 text-[1.05rem]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <Link
                        href={`/subjects/${c.slug}`}
                        className="font-display hover:decoration-thread inline-flex items-center gap-3 text-[1.25rem] hover:underline hover:underline-offset-4"
                      >
                        <span
                          aria-hidden="true"
                          className="inline-block size-2 rotate-45"
                          style={{ backgroundColor: `var(${c.threadColor})` }}
                        />
                        {c.name}
                      </Link>
                      <p className="reading text-muted mt-2 text-[1rem]">{c.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
            <section aria-labelledby="types">
              <h2 id="types" className="font-display text-[1.65rem]">
                Article types
              </h2>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                {TYPES.map(([t, d]) => (
                  <div key={t} className="border-thread border-t-2 pt-4">
                    <dt className="font-display text-[1.15rem]">{t}</dt>
                    <dd className="text-muted mt-2 text-[0.95rem]">{d}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section aria-labelledby="who">
              <h2 id="who" className="font-display text-[1.65rem]">
                Who may submit
              </h2>
              <p className="reading mt-4">
                JHTS welcomes work from scholars and researchers at any stage, and from undergraduate and postgraduate
                students. Every manuscript is judged on the same terms: originality, rigour, clarity and relevance to
                the journal’s scope.
              </p>
              <p className="mt-6">
                <Link href="/author-guidelines" className="text-brand decoration-thread underline underline-offset-4">
                  Read the author guidelines
                </Link>
              </p>
            </section>
          </div>
        }
      />
    </>
  );
}
