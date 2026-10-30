import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { issueLabel } from "@/lib/issues";
import { userClient } from "@/lib/supabase/clients";
import { CallForm } from "./CallForm";

export const metadata = { title: "Call for Papers" };

/** "2027-01-15T23:59" in Lagos time, for datetime-local inputs. */
function lagosLocal(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour") === "24" ? "00" : g("hour")}:${g("minute")}`;
}

export default async function CallsPage() {
  await requireRole(["super_admin", "editor"], "/admin/call-for-papers");
  const db = await userClient();
  const [{ data: calls }, { data: issues }] = await Promise.all([
    db
      .from("call_for_papers")
      .select(
        "id, version, title, target_issue_id, target_label, summary_html, banner_text, submission_deadline, review_period, publication_month, is_active, updated_at",
      )
      .order("is_active", { ascending: false })
      .order("submission_deadline", { ascending: false }),
    db
      .from("issues")
      .select("id, number, month, volume:volumes ( number, year )")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);
  const options = (issues ?? []).map((i) => {
    const v = i.volume as unknown as { number: number; year: number };
    return { value: i.id, label: issueLabel({ volume: v.number, number: i.number, month: i.month, year: v.year }) };
  });
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Call for Papers"
        description="One call is active at a time. It drives the Call for Papers page, the home-page countdown and the site banner."
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-4 xl:col-span-8">
          {(calls ?? []).map((c) => (
            <details key={c.id} open={c.is_active} className="admin-box">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span className="font-display text-[1.15rem]">{c.title}</span>
                <StatusPill status={c.is_active ? "published" : "draft"} />
                <span className="text-muted text-[0.84rem]">Deadline {formatDate(c.submission_deadline)}</span>
              </summary>
              <div className="mt-5">
                <CallForm
                  issues={options}
                  values={{
                    id: c.id,
                    version: c.version,
                    title: c.title,
                    target_issue_id: c.target_issue_id ?? "",
                    target_label: c.target_label,
                    summary_html: c.summary_html,
                    banner_text: c.banner_text,
                    deadline: lagosLocal(c.submission_deadline),
                    review_period: c.review_period ?? "",
                    publication_month: c.publication_month ?? "",
                    is_active: c.is_active,
                  }}
                />
              </div>
            </details>
          ))}
          {!calls?.length && <p className="text-muted">No calls yet.</p>}
        </div>
        <aside className="col-span-12 xl:col-span-4">
          <details className="admin-box">
            <summary className="font-display cursor-pointer text-[1.1rem]">New call</summary>
            <div className="mt-4">
              <CallForm issues={options} />
            </div>
          </details>
        </aside>
      </div>
    </>
  );
}
