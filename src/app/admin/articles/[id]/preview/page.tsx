import Link from "next/link";
import { notFound } from "next/navigation";
import { ProseBody } from "@/components/journal/ProseBody";
import { requireRole } from "@/lib/auth";
import { joinNames } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";

export const metadata = { title: "Article preview" };

/** The article as readers will see it, before it is public. */
export default async function ArticlePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["super_admin", "editor", "book_review_editor"], "/admin/articles");
  const { id } = await params;
  const { data: a } = await (
    await userClient()
  )
    .from("articles")
    .select("id, title, type, abstract, keywords, body_html, authors:article_authors ( name, affiliation, position )")
    .eq("id", id)
    .maybeSingle();
  if (!a) notFound();
  const authors = (a.authors as { name: string; affiliation: string | null; position: number }[]).sort(
    (x, y) => x.position - y.position,
  );
  return (
    <div>
      <p className="border-thread text-thread-text border-b px-5 py-2 text-[0.85rem] lg:px-10">
        Preview · not public yet ·{" "}
        <Link href={`/admin/articles/${a.id}`} className="font-medium underline underline-offset-4">
          Back to editing
        </Link>
      </p>
      <header className="max-w-page mx-auto px-5 pt-12 lg:px-10">
        <p className="smallcaps text-muted text-[0.85rem]">{ARTICLE_TYPE_LABEL[a.type as ArticleType]}</p>
        <h1 className="font-display mt-3 max-w-[48rem] text-[clamp(2rem,1.6rem+1.8vw,3.2rem)] leading-[1.08]">
          {a.title}
        </h1>
        <p className="mt-4 text-[1.05rem]">{joinNames(authors.map((x) => x.name))}</p>
        <p className="text-muted text-[0.9rem]">
          {[...new Set(authors.map((x) => x.affiliation).filter(Boolean))].join(" · ")}
        </p>
        {a.abstract && (
          <div className="border-rule mt-8 max-w-[44rem] border-t pt-6">
            <p className="smallcaps text-muted text-[0.8rem]">Abstract</p>
            <p className="reading mt-2">{a.abstract}</p>
            <p className="text-muted mt-3 text-[0.9rem]">Keywords: {(a.keywords as string[]).join(", ")}</p>
          </div>
        )}
      </header>
      {a.body_html ? (
        <ProseBody html={a.body_html} />
      ) : (
        <p className="text-muted max-w-page mx-auto px-5 py-12 lg:px-10">
          No HTML full text; readers will use the PDF.
        </p>
      )}
    </div>
  );
}
