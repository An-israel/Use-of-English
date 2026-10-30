import Link from "next/link";
import { notFound } from "next/navigation";
import { ProseBody } from "@/components/journal/ProseBody";
import { IssueCover } from "@/components/weave/IssueCover";
import { requireRole } from "@/lib/auth";
import { joinNames } from "@/lib/format";
import { issueLabel, pageRange } from "@/lib/issues";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";

export const metadata = { title: "Issue preview" };

/** How the issue will read once published (drafts are invisible on the public site). */
export default async function IssuePreview({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["super_admin", "editor"], "/admin/issues");
  const { id } = await params;
  const db = await userClient();
  const { data: i } = await db
    .from("issues")
    .select("id, number, month, title, editorial, cover_path, volume:volumes ( number, year )")
    .eq("id", id)
    .maybeSingle();
  if (!i) notFound();
  const v = i.volume as unknown as { number: number; year: number };
  const { data: articles } = await db
    .from("articles")
    .select("id, title, type, first_page, last_page, status, authors:article_authors ( name, position )")
    .eq("issue_id", id)
    .is("deleted_at", null)
    .order("sort_order");
  const coverUrl = i.cover_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${i.cover_path}`
    : null;
  return (
    <div>
      <p className="border-thread text-thread-text border-b px-5 py-2 text-[0.85rem] lg:px-10">
        Preview · not public yet ·{" "}
        <Link href={`/admin/issues/${i.id}`} className="font-medium underline underline-offset-4">
          Back to editing
        </Link>
      </p>
      <header className="max-w-page mx-auto grid grid-cols-12 gap-6 px-5 py-12 lg:px-10">
        <div className="col-span-5 sm:col-span-3">
          <IssueCover
            volume={v.number}
            issue={i.number}
            month={i.month}
            year={v.year}
            coverUrl={coverUrl}
            sizes="240px"
          />
        </div>
        <div className="col-span-12 sm:col-span-9">
          <p className="smallcaps text-muted text-[0.85rem]">
            {issueLabel({ volume: v.number, number: i.number, month: i.month, year: v.year })}
          </p>
          <h1 className="font-display mt-2 text-[clamp(2rem,1.6rem+1.6vw,3rem)] leading-tight">
            {i.title || "Untitled issue"}
          </h1>
          <ol className="divide-rule border-rule mt-8 divide-y border-y">
            {(articles ?? []).map((a) => (
              <li key={a.id} className="py-4">
                <p className="smallcaps text-muted text-[0.75rem]">{ARTICLE_TYPE_LABEL[a.type as ArticleType]}</p>
                <Link href={`/admin/articles/${a.id}/preview`} className="font-display text-[1.25rem] hover:underline">
                  {a.title}
                </Link>
                <p className="text-muted text-[0.9rem]">
                  {joinNames(
                    (a.authors as { name: string; position: number }[])
                      .sort((x, y) => x.position - y.position)
                      .map((x) => x.name),
                  )}
                  {pageRange(a.first_page, a.last_page) ? ` · ${pageRange(a.first_page, a.last_page)}` : ""}
                </p>
              </li>
            ))}
            {!articles?.length && <li className="text-muted py-4">No articles yet.</li>}
          </ol>
        </div>
      </header>
      {i.editorial && <ProseBody html={i.editorial} toc={false} />}
    </div>
  );
}
