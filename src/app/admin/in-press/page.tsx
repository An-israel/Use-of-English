import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ARTICLE_LIST_SELECT, ArticleTable, type ArticleListRow } from "@/components/admin/ArticleTable";
import { EmptyState } from "@/components/journal/EmptyState";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { issueLabel } from "@/lib/issues";
import { userClient } from "@/lib/supabase/clients";
import { IssuePicker } from "../articles/[id]/Editors";

export const metadata = { title: "Articles in Press" };

export default async function InPressPage() {
  await requireRole(["super_admin", "editor"], "/admin/in-press");
  const db = await userClient();
  const [{ data }, { data: issues }] = await Promise.all([
    db
      .from("articles")
      .select(ARTICLE_LIST_SELECT)
      .eq("status", "in_press")
      .is("deleted_at", null)
      .order("online_at", { ascending: false })
      .returns<ArticleListRow[]>(),
    db
      .from("issues")
      .select("id, number, month, status, volume:volumes ( number, year )")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);
  const options = (issues ?? []).map((i) => {
    const v = i.volume as unknown as { number: number; year: number };
    return {
      value: i.id,
      label: `${issueLabel({ volume: v.number, number: i.number, month: i.month, year: v.year })}${i.status === "published" ? "" : ` (${i.status})`}`,
    };
  });
  const rows = data ?? [];
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Articles in Press"
        description="Accepted articles already online, before they appear in an issue. Assign one to a forthcoming issue and it joins the issue when that is published; it stays online meanwhile."
      />
      <div className="px-5 py-6 lg:px-10">
        {!rows.length ? (
          <EmptyState title="Nothing in press">Publish an article without an issue to put it online here.</EmptyState>
        ) : (
          <ArticleTable
            rows={rows}
            extra={(r) => (
              <div className="min-w-[16rem]">
                <p className="text-muted mb-1 text-[0.78rem]">Online since {formatDate(r.online_at)}</p>
                <IssuePicker articleId={r.id} current={r.issue_id ?? ""} issues={options} />
              </div>
            )}
          />
        )}
      </div>
    </>
  );
}
