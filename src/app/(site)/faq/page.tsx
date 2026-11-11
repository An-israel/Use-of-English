import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/journal/PageHeader";
import { ProseBody } from "@/components/journal/ProseBody";
import { getPage } from "@/lib/data";

export const metadata: Metadata = {
  title: "Questions and Timeline",
  description: "Common questions about submitting to JHTS, and how long each editorial stage usually takes.",
  alternates: { canonical: "/faq" },
};

/** FAQ with the editorial timeline (I5); the text is an editable page. */
export default async function FaqPage() {
  const page = await getPage("page", "faq");
  if (!page) notFound();
  return (
    <>
      <PageHeader
        crumbs={[{ label: "Home", href: "/" }, { label: "Questions and Timeline" }]}
        eyebrow="For authors"
        title={page.title}
        summary={page.summary}
        seed={53}
      />
      <ProseBody
        html={page.bodyHtml}
        updatedAt={page.updatedAt}
        aside={
          <div className="border-rule bg-surface rounded-[3px] border p-5">
            <p className="smallcaps text-muted text-[0.78rem]">Manuscript template</p>
            <p className="mt-2 text-[0.95rem]">Times New Roman 12 pt, double-spaced, with the recommended headings.</p>
            <a
              href="/templates/JHTS-manuscript-template.docx"
              download
              className="bg-brand text-brand-fg hover:bg-brand-hover mt-4 inline-block rounded-sm px-4 py-2.5 text-[0.92rem] font-medium"
            >
              Download (Word)
            </a>
            <p className="text-muted mt-4 text-[0.85rem]">
              More in the{" "}
              <Link href="/author-guidelines" className="decoration-thread underline underline-offset-4">
                Author Guidelines
              </Link>
              .
            </p>
          </div>
        }
      />
    </>
  );
}
