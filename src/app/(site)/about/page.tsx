import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FactList } from "@/components/journal/FactList";
import { PageHeader } from "@/components/journal/PageHeader";
import { ProseBody } from "@/components/journal/ProseBody";
import { getPage, getSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "About the Journal",
  description:
    "Purpose, publisher, frequency and open-access policy of the Journal of Humanities and Transcultural Studies.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [page, s] = await Promise.all([getPage("page", "about"), getSettings()]);
  if (!page) notFound();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        eyebrow="About the journal"
        title={page.title}
        summary={page.summary}
        seed={37}
      />
      <ProseBody
        html={page.bodyHtml}
        updatedAt={page.updatedAt}
        aside={
          <FactList
            title="At a glance"
            items={[
              ["Publisher", s.publisher],
              [
                "Established",
                <span key="e" className="tabular">
                  {s.foundedYear}
                </span>,
              ],
              ["Frequency", s.frequency],
              ["Format", "Electronic only"],
              ["Peer review", "Double-blind"],
              ["ISSN", s.issn ?? "In process"],
              ["DOI prefix", s.doiPrefix ?? "Pending Crossref membership"],
              [
                "Licence",
                <a
                  key="l"
                  href={s.licence.url}
                  rel="license noopener"
                  className="decoration-thread underline underline-offset-4"
                >
                  {s.licence.name}
                </a>,
              ],
            ]}
          />
        }
      />
    </>
  );
}
