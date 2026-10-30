import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/journal/EmptyState";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { userClient } from "@/lib/supabase/clients";
import { STATUSES, STATUS_LABEL, type SubmissionStatus } from "@/lib/workflow";

export const metadata = { title: "Submissions" };

type Row = {
  id: string;
  public_id: string | null;
  title: string;
  status: SubmissionStatus;
  updated_at: string;
  author: { full_name: string; email: string } | null;
};

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["super_admin", "editor", "book_review_editor", "finance_officer"], "/admin/submissions");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as SubmissionStatus) ? (sp.status as SubmissionStatus) : null;
  let q = (await userClient())
    .from("submissions")
    .select("id, public_id, title, status, updated_at, author:profiles!submissions_author_id_fkey ( full_name, email )")
    .neq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data } = await q.returns<Row[]>();
  return (
    <>
      <AdminPageHeader
        title="Submissions"
        description="Every submitted manuscript. The kanban view, saved filters and reviewer assignment arrive with the full dashboard."
      />
      <div className="px-5 py-8 lg:px-10">
        <nav aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2 text-[0.85rem]">
          <Link
            href="/admin/submissions"
            className={`rounded-sm border px-3 py-1.5 ${!status ? "border-fg bg-fg text-bg" : "border-rule"}`}
          >
            All
          </Link>
          {STATUSES.filter((s) => s !== "draft").map((s) => (
            <Link
              key={s}
              href={`/admin/submissions?status=${s}`}
              className={`rounded-sm border px-3 py-1.5 ${status === s ? "border-fg bg-fg text-bg" : "border-rule"}`}
            >
              {STATUS_LABEL[s]}
            </Link>
          ))}
        </nav>
        {!data?.length ? (
          <EmptyState title="No submissions">Submitted manuscripts appear here.</EmptyState>
        ) : (
          <div className="border-rule bg-surface overflow-x-auto rounded-[3px] border">
            <table className="w-full min-w-[46rem] text-left text-[0.92rem]">
              <thead className="border-rule text-muted border-b">
                <tr>
                  {["ID", "Title", "Author", "Status", "Updated"].map((h) => (
                    <th key={h} scope="col" className="smallcaps px-4 py-3 text-[0.78rem] font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-rule divide-y">
                {data.map((r) => (
                  <tr key={r.id}>
                    <td className="tabular px-4 py-3">{r.public_id}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/submissions/${r.id}`}
                        className="hover:decoration-thread font-medium hover:underline hover:underline-offset-4"
                      >
                        {r.title}
                      </Link>
                    </td>
                    <td className="text-muted px-4 py-3">{r.author?.full_name}</td>
                    <td className="px-4 py-3">{STATUS_LABEL[r.status]}</td>
                    <td className="tabular text-muted px-4 py-3">{formatDate(r.updated_at)}</td>
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
