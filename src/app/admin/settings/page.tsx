import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FEATURE_FLAG_DESCRIPTIONS } from "@/content/journal";
import { requireRole } from "@/lib/auth";
import { getFlags, getSettings } from "@/lib/data";
import { isPaymentTestMode } from "@/lib/payments/paystack";
import { systemInfo } from "../journal-actions";
import { FlagToggles, SettingsForm } from "./SettingsForms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole(["super_admin"], "/admin/settings");
  const [settings, flags, info] = await Promise.all([getSettings(), getFlags(), systemInfo()]);
  let mode = "live";
  try {
    mode = isPaymentTestMode()
      ? process.env.PAYSTACK_MODE === "mock"
        ? "mock (local simulator)"
        : "test keys"
      : "live";
  } catch {
    mode = "misconfigured";
  }
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Settings"
        description="Journal details, fees and feature flags. Changes appear on the site within seconds."
      />
      <div className="grid grid-cols-12 gap-6 px-5 py-8 lg:px-10">
        <div className="col-span-12 xl:col-span-8">
          <SettingsForm s={settings} />
        </div>
        <aside className="col-span-12 space-y-6 xl:col-span-4">
          <section className="admin-box" aria-labelledby="ff">
            <h2 id="ff" className="font-display text-[1.15rem]">
              Feature flags
            </h2>
            <p className="text-muted mt-1 text-[0.82rem]">Switch features on or off without a deployment.</p>
            <FlagToggles
              flags={Object.entries(FEATURE_FLAG_DESCRIPTIONS).map(([key, description]) => ({
                key,
                description,
                enabled: flags[key as keyof typeof flags],
              }))}
            />
          </section>
          <section className="admin-box" aria-labelledby="sys">
            <h2 id="sys" className="font-display text-[1.15rem]">
              System
            </h2>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.88rem]">
              <dt className="text-muted">Schema version</dt>
              <dd className="tabular font-mono text-[0.8rem]">{info?.version ?? "unknown"}</dd>
              <dt className="text-muted">Payments</dt>
              <dd className={mode === "live" ? "" : "text-thread-text font-medium"}>
                {mode === "live" ? "Live" : `TEST MODE: ${mode}`}
              </dd>
              <dt className="text-muted">Queued jobs</dt>
              <dd className="tabular">{String(info?.health?.queue_depth ?? "—")}</dd>
              <dt className="text-muted">Failed jobs</dt>
              <dd className="tabular">{String(info?.health?.dead_letters ?? "—")}</dd>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
