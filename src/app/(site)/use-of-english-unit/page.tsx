import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { ProseBody } from "@/components/journal/ProseBody";
import { getPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "The Use of English Unit",
  description: "The Use of English Unit, School of General Studies, University of Nigeria, Nsukka: publisher of JHTS.",
  alternates: { canonical: "/use-of-english-unit" },
};

export default async function UnitPage() {
  const page = await getPage("page", "use-of-english-unit");
  if (!page) notFound();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "About", href: "/about" }, { label: page.title }]}
        eyebrow="Our publisher"
        title={page.title}
        summary={page.summary}
        seed={41}
      />
      <ProseBody html={page.bodyHtml} updatedAt={page.updatedAt} />
    </>
  );
}
