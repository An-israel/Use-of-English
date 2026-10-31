import Link from "next/link";
import clsx from "clsx";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EmptyState } from "@/components/journal/EmptyState";
import { requireRole } from "@/lib/auth";
import { formatDate, formatNaira, isoDateFromNow } from "@/lib/format";
import { FLAG_LABEL, type FlagKind } from "@/lib/payments/reconcile";
import { adminClient, userClient } from "@/lib/supabase/clients";
import { ResolveForm, RunForm } from "./Forms";

export const metadata = { title: "Reconciliation" };

type Flag = {
  id: string;
  run_date: string;
  kind: FlagKind;
  paystack_reference: string | null;
  payment_id: string | null;
  details: Record<string, string | number>;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  resolver: { full_name: string } | null;
};

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const viewer = await requireRole(["super_admin", "finance_officer", "editor"], "/admin/reconciliation");
  const sp = await searchParams;
  const resolved = sp.show === "resolved";
  const db = await userClient();
  let q = db
    .from("reconciliation_flags")
    .select(
      "id, run_date, kind, paystack_reference, payment_id, details, resolved_at, resolution_note, created_at, resolver:profiles ( full_name )",
    )
    .order("run_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  q = resolved ? q.not("resolved_at", "is", null) : q.is("resolved_at", null);
  const [{ data }, { data: lease }] = await Promise.all([
    q.returns<Flag[]>(),
    // Lease rows are Super-Admin-only under RLS; when the job last ran is harmless to show finance staff.
    adminClient().from("cron_leases").select("last_finished_at, last_status").eq("name", "reconcile").maybeSingle(),
  ]);
  const flags = data ?? [];
  const canAct = ["super_admin", "finance_officer"].includes(viewer.role);
  const tab = (on: boolean) => clsx("px-3 py-1.5", on ? "bg-fg text-bg" : "text-muted hover:text-fg");

  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Reconciliation"
        description="Every night the site compares the previous day’s Paystack transactions with its own records and lists anything that doesn’t match. Nothing is changed automatically."
        actions={
          <div role="group" aria-label="Show" className="border-rule flex rounded-sm border text-[0.86rem]">
            <Link href="/admin/reconciliation" className={tab(!resolved)} aria-current={!resolved ? "page" : undefined}>
              To check
            </Link>
            <Link
              href="/admin/reconciliation?show=resolved"
              className={tab(resolved)}
              aria-current={resolved ? "page" : undefined}
            >
              Resolved
            </Link>
          </div>
        }
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 space-y-4 xl:col-span-8">
          {!flags.length ? (
            <EmptyState title={resolved ? "Nothing resolved yet" : "Everything matches"}>
              {resolved
                ? "Resolved flags are kept here with the note that closed them."
                : "No mismatches between Paystack and the journal’s records."}
            </EmptyState>
          ) : (
            flags.map((f) => (
              <article key={f.id} className={clsx("admin-box", !f.resolved_at && "border-l-accent border-l-2")}>
                <header className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-[1rem] font-medium">{FLAG_LABEL[f.kind]}</h2>
                  <span className="tabular text-muted text-[0.82rem]">Day checked: {formatDate(f.run_date)}</span>
                </header>
                <p className="tabular mt-1 text-[0.9rem]">
                  {f.payment_id ? (
                    <Link href={`/admin/payments/${f.payment_id}`} className="underline underline-offset-4">
                      {f.paystack_reference}
                    </Link>
                  ) : (
                    f.paystack_reference
                  )}
                </p>
                <p className="text-muted mt-1 text-[0.86rem]">{describe(f)}</p>
                {f.resolved_at ? (
                  <p className="mt-3 text-[0.88rem]">
                    Resolved {formatDate(f.resolved_at)}
                    {f.resolver ? ` by ${f.resolver.full_name}` : ""}: {f.resolution_note}
                  </p>
                ) : canAct ? (
                  <div className="mt-4">
                    <ResolveForm id={f.id} />
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
        <aside className="col-span-12 space-y-6 xl:col-span-4">
          {canAct && (
            <section className="admin-box" aria-labelledby="run">
              <h2 id="run" className="font-display mb-1 text-[1.1rem]">
                Check a day now
              </h2>
              <p className="text-muted mb-4 text-[0.84rem]">
                Re-running a day only adds mismatches not already listed.
              </p>
              <RunForm defaultDate={isoDateFromNow(0)} />
            </section>
          )}
          <p className="text-muted text-[0.84rem]">
            Last automatic run:{" "}
            {lease?.last_finished_at ? `${formatDate(lease.last_finished_at)} (${lease.last_status})` : "not yet"}.
          </p>
        </aside>
      </div>
    </>
  );
}

function describe(f: Flag): string {
  const d = f.details;
  const money = (k: string) => (typeof d[k] === "number" ? formatNaira(d[k] as number) : "?");
  switch (f.kind) {
    case "missing_in_db":
      return `Paystack received ${money("paystack_amount_kobo")} with this reference, but the journal has no such payment.`;
    case "missing_in_paystack":
      return `The journal recorded ${money("db_amount_kobo")} as paid, but Paystack has no successful transaction for it.`;
    case "amount_mismatch":
      return `The journal recorded ${money("db_amount_kobo")}; Paystack received ${money("paystack_amount_kobo")}${d.currency && d.currency !== "NGN" ? ` in ${d.currency}` : ""}.`;
    case "status_mismatch":
      return `The journal says “${d.db_status}”; Paystack says “${d.paystack_status}”. A webhook may have been missed.`;
  }
}
