import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/journal/EmptyState";
import { Pagination } from "@/components/journal/Pagination";
import { pageOf, searchTerm, withParams } from "@/lib/admin/query";
import { requireRole } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";

export const metadata = { title: "Audit log" };

const PER_PAGE = 50;
const TABLES = [
  "profiles",
  "submissions",
  "review_assignments",
  "payments",
  "refunds",
  "articles",
  "issues",
  "pages",
  "categories",
  "editorial_board_members",
  "call_for_papers",
  "site_settings",
  "feature_flags",
];

/** Who did what and when (brief section 11.1, item 14). Super Admin only (RLS). */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["super_admin"], "/admin/audit");
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const who = searchTerm(sp.who);
  const table = sp.table && TABLES.includes(sp.table) ? sp.table : null;
  let q = (await userClient())
    .from("audit_log")
    .select("id, actor_email, action, table_name, row_id, changes, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (table) q = q.eq("table_name", table);
  if (who) q = q.ilike("actor_email", `%${who}%`);
  if (sp.action) q = q.eq("action", sp.action.slice(0, 40));
  const { data, count } = await q;
  const rows = data ?? [];
  const current = { who: sp.who, table: sp.table, action: sp.action };
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Audit log"
        description="Every change to accounts, submissions, payments and published content, with who made it and when. Entries can’t be edited or deleted."
      />
      <div className="space-y-5 px-5 py-6 lg:px-10">
        <form action="/admin/audit" className="flex flex-wrap items-end gap-3" role="search">
          <label className="admin-label min-w-[14rem]">
            Person (email)
            <input name="who" type="search" defaultValue={sp.who} className="admin-input" />
          </label>
          <label className="admin-label">
            What
            <select name="table" defaultValue={table ?? ""} className="admin-input">
              <option value="">Everything</option>
              {TABLES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label">
            Action
            <select name="action" defaultValue={sp.action ?? ""} className="admin-input">
              <option value="">Any</option>
              {[
                "insert",
                "update",
                "delete",
                "invite",
                "role_change",
                "deactivate",
                "reactivate",
                "finance_export",
              ].map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-line">
            Apply
          </button>
          {(who || table || sp.action) && (
            <Link href="/admin/audit" className="btn-quiet">
              Clear
            </Link>
          )}
        </form>
        {!rows.length ? (
          <EmptyState title="Nothing recorded">No changes match these filters.</EmptyState>
        ) : (
          <>
            <div className="border-rule bg-surface overflow-x-auto rounded-[3px] border">
              <table className="admin-table min-w-[56rem]">
                <thead>
                  <tr>
                    <th scope="col">When (Lagos)</th>
                    <th scope="col">Who</th>
                    <th scope="col">Action</th>
                    <th scope="col">What</th>
                    <th scope="col">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="tabular text-muted whitespace-nowrap">
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                          timeZone: "Africa/Lagos",
                        }).format(new Date(r.created_at))}
                      </td>
                      <td>{r.actor_email ?? <span className="text-muted">system</span>}</td>
                      <td className="whitespace-nowrap">{r.action.replace(/_/g, " ")}</td>
                      <td className="whitespace-nowrap">
                        {r.table_name.replace(/_/g, " ")}
                        {r.row_id && (
                          <span className="text-muted block font-mono text-[0.72rem]">
                            {String(r.row_id).slice(0, 8)}
                          </span>
                        )}
                      </td>
                      <td>
                        {r.changes ? (
                          <details className="text-[0.78rem]">
                            <summary className="text-muted cursor-pointer">
                              {Object.keys(r.changes as object)
                                .slice(0, 4)
                                .join(", ")}
                              {Object.keys(r.changes as object).length > 4 ? "…" : ""}
                            </summary>
                            <pre className="bg-bg mt-1 max-w-[36rem] overflow-x-auto rounded-[2px] p-2">
                              {JSON.stringify(r.changes, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pages={Math.ceil((count ?? 0) / PER_PAGE)}
              href={(p) => withParams("/admin/audit", current, { page: String(p) })}
            />
          </>
        )}
      </div>
    </>
  );
}
