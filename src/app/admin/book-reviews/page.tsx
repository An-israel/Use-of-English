import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { EmptyState } from "@/components/journal/EmptyState";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";

export const metadata = { title: "Book reviews" };

type Row = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  is_sample: boolean;
  book: { book_title: string; book_author: string; publisher: string | null; year: number | null } | null;
  authors: { name: string; position: number }[];
};

export default async function BookReviewsAdmin() {
  await requireRole(["super_admin", "editor", "book_review_editor"], "/admin/book-reviews");
  const { data } = await (
    await userClient()
  )
    .from("articles")
    .select(
      "id, title, status, updated_at, is_sample, book:book_reviews ( book_title, book_author, publisher, year ), authors:article_authors ( name, position )",
    )
    .eq("type", "book_review")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .returns<Row[]>();
  const rows = data ?? [];
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Book reviews"
        description="Reviews of new books, with the book’s details and cover. They go through peer review like articles."
        actions={
          <Link href="/admin/articles/new?type=book_review" className="btn-primary">
            New book review
          </Link>
        }
      />
      <div className="px-5 py-6 lg:px-10">
        {!rows.length ? (
          <EmptyState title="No book reviews yet">
            Create one, or turn an accepted book-review submission into one.
          </EmptyState>
        ) : (
          <div className="border-rule bg-surface overflow-x-auto rounded-[3px] border">
            <table className="admin-table min-w-[48rem]">
              <thead>
                <tr>
                  <th scope="col">Book</th>
                  <th scope="col">Reviewer</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link
                        href={`/admin/articles/${r.id}`}
                        className="font-medium hover:underline hover:underline-offset-4"
                      >
                        <cite className="not-italic">{r.book?.book_title ?? r.title}</cite>
                      </Link>
                      {r.is_sample && <span className="text-accent ml-2 text-[0.72rem]">SAMPLE</span>}
                      <span className="text-muted block text-[0.8rem]">
                        {[r.book?.book_author, r.book?.publisher, r.book?.year].filter(Boolean).join(" · ")}
                      </span>
                    </td>
                    <td className="text-muted">
                      {r.authors
                        .sort((a, b) => a.position - b.position)
                        .map((a) => a.name)
                        .join(", ") || "—"}
                    </td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td className="tabular text-muted whitespace-nowrap">{formatDate(r.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
