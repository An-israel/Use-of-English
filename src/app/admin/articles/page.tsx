import Link from "next/link";
import clsx from "clsx";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ARTICLE_LIST_SELECT, ArticleTable, type ArticleListRow } from "@/components/admin/ArticleTable";
import { SavedFilters } from "@/components/admin/SavedFilters";
import { EmptyState } from "@/components/journal/EmptyState";
import { Pagination } from "@/components/journal/Pagination";
import { ADMIN_PAGE_SIZE, pageOf, range, searchTerm, withParams } from "@/lib/admin/query";
import { requireRole } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { restoreArticle } from "./actions";

export const metadata = { title: "Articles" };

const STATUS_FILTERS = [
  ["", "All"],
  ["draft", "Drafts"],
  ["scheduled", "Scheduled"],
  ["in_press", "In Press"],
  ["published", "Published"],
  ["unpublished", "Unpublished"],
  ["bin", "In the bin"],
] as const;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["super_admin", "editor"], "/admin/articles");
  const sp = await searchParams;
  const status = STATUS_FILTERS.some(([k]) => k && k === sp.status) ? sp.status! : "";
  const type = sp.type && sp.type in ARTICLE_TYPE_LABEL ? (sp.type as ArticleType) : null;
  const q = searchTerm(sp.q);
  const page = pageOf(sp.page);
  const db = await userClient();
  let query = db
    .from("articles")
    .select(ARTICLE_LIST_SELECT, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(...range(page));
  query = status === "bin" ? query.not("deleted_at", "is", null) : query.is("deleted_at", null);
  if (status && status !== "bin") query = query.eq("status", status);
  if (type) query = query.eq("type", type);
  if (q) query = query.or(`title.ilike.*${q}*,slug.ilike.*${q}*,doi.ilike.*${q}*`);
  const [{ data, count }, { data: saved }] = await Promise.all([
    query.returns<ArticleListRow[]>(),
    db.from("saved_filters").select("id, name, query").eq("scope", "articles").order("name"),
  ]);
  const rows = data ?? [];
  const current = { q: sp.q, status: sp.status, type: sp.type };
  const filterQuery = new URLSearchParams(
    Object.entries(current).filter(([, v]) => v) as [string, string][],
  ).toString();
  const chip = (on: boolean) =>
    clsx(
      "rounded-sm border px-2.5 py-1 whitespace-nowrap",
      on ? "border-fg bg-fg text-bg" : "border-rule hover:border-fg/40",
    );

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Articles"
        description="Everything the journal publishes. Drafts are never public."
        actions={
          <Link href="/admin/articles/new" className="btn-primary">
            New article
          </Link>
        }
      />
      <div className="space-y-5 px-5 py-6 lg:px-10">
        <form action="/admin/articles" className="flex flex-wrap items-end gap-3" role="search">
          <label className="admin-label min-w-[14rem] flex-1">
            Search
            <input
              name="q"
              type="search"
              defaultValue={sp.q}
              placeholder="Title, URL slug or DOI"
              className="admin-input"
            />
          </label>
          <label className="admin-label">
            Type
            <select name="type" defaultValue={type ?? ""} className="admin-input">
              <option value="">All types</option>
              {Object.entries(ARTICLE_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {status && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="btn-line">
            Apply
          </button>
        </form>
        <SavedFilters scope="articles" base="/admin/articles" query={filterQuery} filters={saved ?? []} />
        <nav aria-label="Filter by status" className="flex gap-1.5 overflow-x-auto pb-1 text-[0.82rem]">
          {STATUS_FILTERS.map(([k, label]) => (
            <Link
              key={k}
              href={withParams("/admin/articles", current, { status: k || null, page: null })}
              className={chip(status === k)}
            >
              {label}
            </Link>
          ))}
        </nav>
        {!rows.length ? (
          <EmptyState title={status === "bin" ? "The bin is empty" : "No articles match"}>
            {status === "bin"
              ? "Deleted articles wait here until restored."
              : "Try another filter, or create an article."}
          </EmptyState>
        ) : (
          <>
            <p className="text-muted text-[0.84rem]">
              {count} article{count === 1 ? "" : "s"}
            </p>
            <ArticleTable
              rows={rows}
              extra={
                status === "bin"
                  ? (r) => (
                      <ActionButton variant="quiet" run={restoreArticle.bind(null, r.id)}>
                        Restore
                      </ActionButton>
                    )
                  : undefined
              }
            />
            <Pagination
              page={page}
              pages={Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE)}
              href={(p) => withParams("/admin/articles", current, { page: String(p) })}
            />
          </>
        )}
      </div>
    </>
  );
}
