import Link from "next/link";
import clsx from "clsx";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SavedFilters } from "@/components/admin/SavedFilters";
import { EmptyState } from "@/components/journal/EmptyState";
import { Pagination } from "@/components/journal/Pagination";
import { ADMIN_PAGE_SIZE, pageOf, range, searchTerm, withParams } from "@/lib/admin/query";
import { requireRole } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { daysSince, formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { STATUSES, STATUS_LABEL, type SubmissionStatus } from "@/lib/workflow";

export const metadata = { title: "Submissions" };

type Row = {
  id: string;
  public_id: string | null;
  title: string;
  type: ArticleType;
  status: SubmissionStatus;
  similarity_percent: number | null;
  submitted_at: string | null;
  updated_at: string;
  author: { full_name: string } | null;
  category: { name: string } | null;
  reviews: { status: string }[];
};

/** The kanban columns: the working stages of the review workflow. */
const BOARD: SubmissionStatus[] = [
  "submitted",
  "under_screening",
  "plagiarism_check",
  "under_peer_review",
  "revisions_requested",
  "revised_received",
  "accepted_awaiting_fee",
  "in_production",
];

const SELECT =
  "id, public_id, title, type, status, similarity_percent, submitted_at, updated_at, author:profiles!submissions_author_id_fkey ( full_name ), category:categories ( name ), reviews:review_assignments ( status )";

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const viewer = await requireRole(
    ["super_admin", "editor", "book_review_editor", "finance_officer"],
    "/admin/submissions",
  );
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as SubmissionStatus) ? (sp.status as SubmissionStatus) : null;
  const type = sp.type && sp.type in ARTICLE_TYPE_LABEL ? (sp.type as ArticleType) : null;
  const q = searchTerm(sp.q);
  const board = sp.view === "board";
  const page = pageOf(sp.page);
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === sp.category) ?? null;

  const db = await userClient();
  let query = db
    .from("submissions")
    .select(SELECT, { count: "exact" })
    .neq("status", "draft")
    .order("updated_at", { ascending: false });
  if (board) query = query.in("status", BOARD).limit(400);
  else {
    if (status) query = query.eq("status", status);
    query = query.range(...range(page));
  }
  if (type) query = query.eq("type", type);
  if (category) query = query.eq("category_id", category.id);
  if (q) query = query.or(`title.ilike.*${q}*,public_id.ilike.*${q}*`);

  const [{ data, count }, { data: saved }] = await Promise.all([
    query.returns<Row[]>(),
    db.from("saved_filters").select("id, name, query").eq("scope", "submissions").order("name"),
  ]);
  const rows = data ?? [];
  const pages = Math.ceil((count ?? 0) / ADMIN_PAGE_SIZE);
  const current = { q: sp.q, status: sp.status, type: sp.type, category: sp.category, view: sp.view };
  const filterQuery = new URLSearchParams(
    Object.entries({ ...current, view: undefined }).filter(([, v]) => v) as [string, string][],
  ).toString();
  const chip = (on: boolean) =>
    clsx(
      "rounded-sm border px-2.5 py-1 whitespace-nowrap",
      on ? "border-fg bg-fg text-bg" : "border-rule hover:border-fg/40",
    );

  return (
    <>
      <AdminPageHeader
        title="Submissions"
        description={
          viewer.role === "book_review_editor"
            ? "Book-review submissions you handle."
            : "Every submitted manuscript. Author names are never shown to reviewers."
        }
        actions={
          <div role="group" aria-label="View" className="border-rule flex rounded-sm border text-[0.86rem]">
            <Link
              href={withParams("/admin/submissions", current, { view: null })}
              aria-current={!board ? "page" : undefined}
              className={clsx("px-3 py-1.5", !board ? "bg-fg text-bg" : "text-muted hover:text-fg")}
            >
              Table
            </Link>
            <Link
              href={withParams("/admin/submissions", current, { view: "board", status: null, page: null })}
              aria-current={board ? "page" : undefined}
              className={clsx("px-3 py-1.5", board ? "bg-fg text-bg" : "text-muted hover:text-fg")}
            >
              Board
            </Link>
          </div>
        }
      />
      <div className="space-y-5 px-5 py-6 lg:px-10">
        <form action="/admin/submissions" className="flex flex-wrap items-end gap-3" role="search">
          {board && <input type="hidden" name="view" value="board" />}
          <label className="admin-label min-w-[14rem] flex-1">
            Search
            <input
              name="q"
              defaultValue={sp.q}
              placeholder="Title or ID (JHTS-…)"
              className="admin-input"
              type="search"
            />
          </label>
          <label className="admin-label">
            Type
            <select name="type" defaultValue={type ?? ""} className="admin-input">
              <option value="">All types</option>
              {Object.entries(ARTICLE_TYPE_LABEL)
                .filter(([k]) => k !== "editorial")
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </label>
          <label className="admin-label">
            Subject
            <select name="category" defaultValue={category?.slug ?? ""} className="admin-input">
              <option value="">All subjects</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {status && <input type="hidden" name="status" value={status} />}
          <button type="submit" className="btn-line">
            Apply
          </button>
          {(q || type || category || status) && (
            <Link href={board ? "/admin/submissions?view=board" : "/admin/submissions"} className="btn-quiet">
              Clear
            </Link>
          )}
        </form>

        <SavedFilters scope="submissions" base="/admin/submissions" query={filterQuery} filters={saved ?? []} />

        {!board && (
          <nav aria-label="Filter by status" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 text-[0.82rem]">
            <Link
              href={withParams("/admin/submissions", current, { status: null, page: null })}
              className={chip(!status)}
            >
              All
            </Link>
            {STATUSES.filter((s) => s !== "draft").map((s) => (
              <Link
                key={s}
                href={withParams("/admin/submissions", current, { status: s, page: null })}
                className={chip(status === s)}
              >
                {STATUS_LABEL[s]}
              </Link>
            ))}
          </nav>
        )}

        {board ? (
          <Board rows={rows} />
        ) : !rows.length ? (
          <EmptyState title={q || status || type || category ? "Nothing matches these filters" : "No submissions yet"}>
            {q || status || type || category
              ? "Try a different search or clear the filters."
              : "Submitted manuscripts appear here as soon as authors send them."}
          </EmptyState>
        ) : (
          <>
            <p className="text-muted text-[0.84rem]">
              {count} submission{count === 1 ? "" : "s"}
            </p>
            <div className="border-rule bg-surface overflow-x-auto rounded-[3px] border">
              <table className="admin-table min-w-[56rem]">
                <thead>
                  <tr>
                    {["ID", "Title", "Author", "Status", "Reviews", "Similarity", "Updated"].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular whitespace-nowrap">{r.public_id}</td>
                      <td>
                        <Link
                          href={`/admin/submissions/${r.id}`}
                          className="hover:decoration-thread font-medium hover:underline hover:underline-offset-4"
                        >
                          {r.title}
                        </Link>
                        <span className="text-muted block text-[0.8rem]">
                          {ARTICLE_TYPE_LABEL[r.type]}
                          {r.category ? ` · ${r.category.name}` : ""}
                        </span>
                      </td>
                      <td className="text-muted">{r.author?.full_name}</td>
                      <td className="whitespace-nowrap">{STATUS_LABEL[r.status]}</td>
                      <td className="tabular text-muted">{reviewSummary(r.reviews)}</td>
                      <td className="tabular">
                        {r.similarity_percent != null ? `${Number(r.similarity_percent)}%` : "—"}
                      </td>
                      <td className="tabular text-muted whitespace-nowrap">{formatDate(r.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pages={pages}
              href={(p) => withParams("/admin/submissions", current, { page: String(p) })}
            />
          </>
        )}
      </div>
    </>
  );
}

function reviewSummary(reviews: { status: string }[]): string {
  const live = reviews.filter((r) => !["declined", "cancelled"].includes(r.status));
  if (!live.length) return "—";
  return `${live.filter((r) => r.status === "submitted").length}/${live.length} in`;
}

function Board({ rows }: { rows: Row[] }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 pb-4 lg:-mx-10 lg:px-10">
      <ol className="grid auto-cols-[16.5rem] grid-flow-col gap-4" aria-label="Submissions by status">
        {BOARD.map((s) => {
          const items = rows.filter((r) => r.status === s);
          return (
            <li key={s} className="bg-surface/60 border-rule flex max-h-[70vh] flex-col rounded-[3px] border">
              <h2 className="border-rule flex items-baseline justify-between border-b px-3.5 py-2.5 text-[0.86rem] font-medium">
                <Link href={`/admin/submissions?status=${s}`} className="hover:underline">
                  {STATUS_LABEL[s]}
                </Link>
                <span className="tabular text-muted">{items.length}</span>
              </h2>
              <ul className="space-y-2 overflow-y-auto p-2.5">
                {items.map((r) => {
                  const days = daysSince(r.updated_at);
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/admin/submissions/${r.id}`}
                        className="bg-surface border-rule hover:border-fg/40 block rounded-[2px] border p-3 transition-colors"
                      >
                        <span className="tabular text-muted block text-[0.74rem]">{r.public_id}</span>
                        <span className="mt-1 line-clamp-3 block text-[0.88rem] leading-snug font-medium">
                          {r.title}
                        </span>
                        <span className="text-muted mt-2 flex justify-between gap-2 text-[0.76rem]">
                          <span className="truncate">{r.category?.name ?? ARTICLE_TYPE_LABEL[r.type]}</span>
                          <span className={clsx("tabular shrink-0", days >= 14 && "text-accent")}>
                            {days === 0 ? "today" : `${days}d`}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
                {!items.length && <li className="text-muted px-1 py-3 text-center text-[0.8rem]">Empty</li>}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
