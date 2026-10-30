import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminForm, AField } from "@/components/admin/AdminForm";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { EmptyState } from "@/components/journal/EmptyState";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { issueLabel } from "@/lib/issues";
import { userClient } from "@/lib/supabase/clients";
import { createNextIssue, createVolumeYear, restoreIssue } from "./actions";

export const metadata = { title: "Issues" };

type Volume = {
  id: string;
  number: number;
  year: number;
  is_sample: boolean;
  issues: {
    id: string;
    number: number;
    month: number;
    title: string | null;
    status: string;
    scheduled_for: string | null;
    published_at: string | null;
    deleted_at: string | null;
    articles: { count: number }[];
  }[];
};

export default async function IssuesPage() {
  await requireRole(["super_admin", "editor"], "/admin/issues");
  const { data } = await (
    await userClient()
  )
    .from("volumes")
    .select(
      "id, number, year, is_sample, issues ( id, number, month, title, status, scheduled_for, published_at, deleted_at, articles ( count ) )",
    )
    .order("year", { ascending: false })
    .returns<Volume[]>();
  const volumes = data ?? [];
  const latestYear = volumes[0]?.year;

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Issues"
        description="Year → volume → issue. Four issues a year: March, June, September and December."
        actions={
          <ActionButton
            variant="primary"
            run={createNextIssue.bind(null, undefined)}
            redirectTo="/admin/issues/{id}"
            confirm={{
              title: "Create the next issue?",
              description: latestYear
                ? `A new draft issue is added to ${latestYear} with its month pre-filled. Nothing is public until you publish it.`
                : "The first volume and issue are created as drafts.",
              confirmLabel: "Create issue",
            }}
          >
            Create the next issue
          </ActionButton>
        }
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-8 xl:col-span-9">
          {!volumes.length && (
            <EmptyState title="No issues yet">Create the first issue; Volume 1 is set up for you.</EmptyState>
          )}
          {volumes.map((v) => {
            const live = v.issues.filter((i) => !i.deleted_at).sort((a, b) => a.number - b.number);
            const binned = v.issues.filter((i) => i.deleted_at);
            return (
              <section key={v.id} aria-labelledby={`v-${v.id}`}>
                <h2 id={`v-${v.id}`} className="font-display text-[1.35rem]">
                  {v.year} · Volume {v.number}
                  {v.is_sample && (
                    <span className="text-accent ml-2 align-middle font-sans text-[0.75rem]">SAMPLE</span>
                  )}
                </h2>
                <div className="border-rule bg-surface mt-3 overflow-x-auto rounded-[3px] border">
                  <table className="admin-table min-w-[40rem]">
                    <thead>
                      <tr>
                        <th scope="col">Issue</th>
                        <th scope="col">Title</th>
                        <th scope="col">Articles</th>
                        <th scope="col">Status</th>
                        <th scope="col">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {live.map((i) => (
                        <tr key={i.id}>
                          <td className="whitespace-nowrap">
                            <Link
                              href={`/admin/issues/${i.id}`}
                              className="font-medium hover:underline hover:underline-offset-4"
                            >
                              {issueLabel({ volume: v.number, number: i.number, month: i.month, year: v.year })}
                            </Link>
                          </td>
                          <td className="text-muted">{i.title ?? "—"}</td>
                          <td className="tabular">{i.articles[0]?.count ?? 0}</td>
                          <td>
                            <StatusPill status={i.status} />
                          </td>
                          <td className="tabular text-muted whitespace-nowrap">
                            {i.status === "scheduled"
                              ? formatDate(i.scheduled_for)
                              : i.published_at
                                ? formatDate(i.published_at)
                                : "—"}
                          </td>
                        </tr>
                      ))}
                      {binned.map((i) => (
                        <tr key={i.id} className="text-muted">
                          <td>{issueLabel({ volume: v.number, number: i.number, month: i.month, year: v.year })}</td>
                          <td colSpan={2}>In the bin since {formatDate(i.deleted_at)}</td>
                          <td>
                            <StatusPill status="deleted" />
                          </td>
                          <td>
                            <ActionButton variant="quiet" run={restoreIssue.bind(null, i.id)}>
                              Restore
                            </ActionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
        <aside className="col-span-12 xl:col-span-3">
          <div className="admin-box">
            <h2 className="font-display text-[1.1rem]">Start a new year</h2>
            <p className="text-muted mt-1 mb-4 text-[0.86rem]">
              Creates the next volume for that year with its first issue (March).
            </p>
            <AdminForm action={createVolumeYear} submitLabel="Create volume" guard={false} resetOnSave>
              <AField
                label="Year"
                name="year"
                type="number"
                min={2026}
                max={2200}
                defaultValue={(latestYear ?? 2026) + 1}
              />
            </AdminForm>
          </div>
        </aside>
      </div>
    </>
  );
}
