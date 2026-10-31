import clsx from "clsx";
import { ActionButton } from "@/components/admin/ActionButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { requireRole } from "@/lib/auth";
import { formatDate, isoDaysAgo } from "@/lib/format";
import { dependencyChecks } from "@/lib/health/checks";
import { adminClient } from "@/lib/supabase/clients";
import { discardDeadLetter, processQueueNow, retryDeadLetter, runMaintenanceNow } from "../system-actions";

export const metadata = { title: "System" };

const when = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }).format(
        new Date(iso),
      )
    : "—";

/**
 * Health, queue, failed jobs, scheduled jobs, backups and schema version
 * (brief section 11.1, item 15; items 20, 56, 61, 82, 84). Super Admin only.
 */
export default async function SystemPage() {
  await requireRole(["super_admin"], "/admin/system");
  // Read with the service role after the role check: operational tables carry no personal data beyond emails.
  const db = adminClient();
  const dayAgo = isoDaysAgo(1);
  const [checks, version, queued, running, dead, leases, backups, emailFails, suppressions] = await Promise.all([
    dependencyChecks(),
    db.rpc("schema_version"),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "queued"),
    db.from("jobs").select("id", { count: "exact", head: true }).eq("status", "running"),
    db
      .from("dead_letter_jobs")
      .select("id, kind, attempts, last_error, failed_at, payload")
      .order("failed_at", { ascending: false })
      .limit(50),
    db.from("cron_leases").select("name, last_started_at, last_finished_at, last_status, last_error").order("name"),
    db
      .from("backup_runs")
      .select("id, status, started_at, finished_at, location")
      .order("started_at", { ascending: false })
      .limit(6),
    db
      .from("email_outbox")
      .select("status")
      .gte("created_at", dayAgo)
      .in("status", ["failed", "bounced", "complained", "suppressed"]),
    db.from("email_suppressions").select("email", { count: "exact", head: true }),
  ]);
  const deadRows = dead.data ?? [];
  const emailBad = (emailFails.data ?? []).reduce<Record<string, number>>(
    (m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }),
    {},
  );
  const lastBackup = backups.data?.[0];
  const dot = (ok: boolean) => (
    <span aria-hidden="true" className={clsx("inline-block size-2 rotate-45", ok ? "bg-brand" : "bg-accent")} />
  );

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="System"
        description="The health of the site’s services and background work. Alerts for failed jobs and backups go to the Super Admin email."
        actions={
          <>
            <ActionButton run={processQueueNow}>Process the queue now</ActionButton>
            <ActionButton run={runMaintenanceNow} variant="quiet">
              Run daily maintenance
            </ActionButton>
          </>
        }
      />
      <div className="space-y-6 px-5 py-8 lg:px-10">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ["Database", checks.database.ok ? `OK · ${checks.database.ms} ms` : "Unreachable", checks.database.ok],
            ["File storage", checks.storage.ok ? `OK · ${checks.storage.ms} ms` : "Unreachable", checks.storage.ok],
            ["Queue", `${queued.count ?? 0} waiting · ${running.count ?? 0} running`, (queued.count ?? 0) < 50],
            ["Failed jobs", String(deadRows.length), deadRows.length === 0],
          ].map(([label, value, ok]) => (
            <div key={label as string} className="admin-box">
              <dt className="smallcaps text-muted flex items-center gap-2 text-[0.76rem]">
                {dot(ok as boolean)} {label}
              </dt>
              <dd className="font-display tabular mt-1 text-[1.3rem] leading-tight">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="admin-box" aria-labelledby="dlq">
          <h2 id="dlq" className="font-display text-[1.15rem]">
            Failed jobs
          </h2>
          <p className="text-muted mt-1 text-[0.84rem]">
            Background work that still failed after every retry (usually an email). Fix the cause, then retry, or
            discard it.
          </p>
          {!deadRows.length ? (
            <p className="text-muted mt-3 text-[0.9rem]">None. Every job has completed.</p>
          ) : (
            <ul className="divide-rule mt-3 divide-y">
              {deadRows.map((j) => (
                <li key={j.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.92rem] font-medium">
                      {j.kind}{" "}
                      <span className="text-muted font-normal">
                        · {j.attempts} attempts · {when(j.failed_at)}
                      </span>
                    </p>
                    <p className="text-accent mt-1 font-mono text-[0.78rem] break-words">{j.last_error}</p>
                    <details className="mt-1 text-[0.78rem]">
                      <summary className="text-muted cursor-pointer">Payload</summary>
                      <pre className="bg-bg mt-1 overflow-x-auto rounded-[2px] p-2">
                        {JSON.stringify(j.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                  <div className="flex gap-2">
                    <ActionButton run={retryDeadLetter.bind(null, j.id)}>Retry</ActionButton>
                    <ActionButton
                      variant="quiet"
                      run={discardDeadLetter.bind(null, j.id)}
                      confirm={{
                        title: "Discard this failed job?",
                        description:
                          "It won’t run again. Do this only when the work is no longer needed or was done by hand.",
                        confirmLabel: "Discard",
                        tone: "danger",
                      }}
                    >
                      Discard
                    </ActionButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid grid-cols-12 gap-6">
          <section className="admin-box col-span-12 lg:col-span-7" aria-labelledby="cron">
            <h2 id="cron" className="font-display text-[1.15rem]">
              Scheduled jobs
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th scope="col">Job</th>
                    <th scope="col">Last finished</th>
                    <th scope="col">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {(leases.data ?? []).map((l) => (
                    <tr key={l.name}>
                      <td className="font-medium">{l.name}</td>
                      <td className="tabular text-muted whitespace-nowrap">{when(l.last_finished_at)}</td>
                      <td>
                        <span className={l.last_status === "ok" ? "text-brand" : "text-accent"}>
                          {l.last_status ?? "—"}
                        </span>
                        {l.last_error && (
                          <span className="text-muted block font-mono text-[0.76rem]">{l.last_error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!leases.data?.length && (
                    <tr>
                      <td colSpan={3} className="text-muted">
                        No scheduled job has run yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section className="admin-box col-span-12 space-y-4 lg:col-span-5" aria-labelledby="bk">
            <h2 id="bk" className="font-display text-[1.15rem]">
              Backups
            </h2>
            <p className="text-[0.9rem]">
              {lastBackup ? (
                <>
                  Last off-site backup: <strong>{when(lastBackup.started_at)}</strong>{" "}
                  <span className={lastBackup.status === "ok" ? "text-brand" : "text-accent"}>
                    ({lastBackup.status})
                  </span>
                </>
              ) : (
                <span className="text-accent">
                  No off-site backup recorded yet. Enable the weekly backup workflow (docs/RUNBOOK.md).
                </span>
              )}
            </p>
            <ul className="text-muted space-y-1 text-[0.82rem]">
              {(backups.data ?? []).slice(1).map((b) => (
                <li key={b.id}>
                  {formatDate(b.started_at)} · {b.status}
                  {b.location ? ` · ${b.location}` : ""}
                </li>
              ))}
            </ul>
            <p className="text-muted text-[0.82rem]">
              Supabase also keeps daily backups of the database (see the runbook).
            </p>
            <h3 className="pt-2 text-[0.95rem] font-medium">Email in the last 24 hours</h3>
            <p className="text-muted text-[0.86rem]">
              {Object.keys(emailBad).length
                ? Object.entries(emailBad)
                    .map(([k, v]) => `${v} ${k}`)
                    .join(" · ")
                : "No failed, bounced or suppressed emails."}{" "}
              · {suppressions.count ?? 0} suppressed address{suppressions.count === 1 ? "" : "es"}
            </p>
            <h3 className="pt-2 text-[0.95rem] font-medium">Schema version</h3>
            <p className="tabular font-mono text-[0.86rem]">{(version.data as string | null) ?? "unknown"}</p>
          </section>
        </div>
      </div>
    </>
  );
}
