"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ACheck, AdminForm, AField, AText } from "@/components/admin/AdminForm";
import { useToast } from "@/components/ui/Toaster";
import type { SiteSettings } from "@/lib/types";
import { saveSettings, setFlag } from "../journal-actions";

const h = "font-display text-[1.15rem] mb-1";

export function SettingsForm({ s }: { s: SiteSettings }) {
  return (
    <AdminForm action={saveSettings} submitLabel="Save settings">
      <fieldset className="admin-box space-y-4">
        <legend className={h}>Journal</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <AField
            className="sm:col-span-2"
            label="Journal name"
            name="journalName"
            defaultValue={s.journalName}
            required
          />
          <AField label="Short name" name="shortName" defaultValue={s.shortName} required />
        </div>
        <AField label="Tagline" name="tagline" defaultValue={s.tagline} />
        <AField label="Publisher" name="publisher" defaultValue={s.publisher} />
        <div className="grid gap-3 sm:grid-cols-2">
          <AField label="Publisher (short)" name="publisherShort" defaultValue={s.publisherShort} />
          <AField label="Frequency" name="frequency" defaultValue={s.frequency} />
          <AField label="Office email" name="contactEmail" defaultValue={s.contactEmail} required />
          <AField label="Office hours" name="officeHours" defaultValue={s.officeHours} />
        </div>
        <AText label="Postal address" name="postalAddress" rows={2} defaultValue={s.postalAddress} />
      </fieldset>
      <fieldset className="admin-box space-y-4">
        <legend className={h}>Identifiers</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <AField label="ISSN (print)" name="issn" defaultValue={s.issn ?? ""} placeholder="1234-567X" />
          <AField label="ISSN (online)" name="eissn" defaultValue={s.eissn ?? ""} placeholder="1234-567X" />
          <AField label="DOI prefix" name="doiPrefix" defaultValue={s.doiPrefix ?? ""} placeholder="10.12345" />
        </div>
        <p className="text-muted text-[0.8rem]">Leave empty until assigned; the site hides them while empty.</p>
      </fieldset>
      <fieldset className="admin-box space-y-4">
        <legend className={h}>Fees</legend>
        <ACheck
          name="feesEnabled"
          defaultChecked={s.fees.enabled}
          label="Charge fees (when off, authors skip every payment step)"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <AField
            label="Review fee (₦)"
            name="reviewNaira"
            type="number"
            min={0}
            step={1}
            defaultValue={s.fees.reviewKobo / 100}
          />
          <AField
            label="Publication fee (₦)"
            name="publicationNaira"
            type="number"
            min={0}
            step={1}
            defaultValue={s.fees.publicationKobo / 100}
          />
        </div>
        <AText label="What the fees cover" name="feesCovers" rows={2} defaultValue={s.fees.covers} />
      </fieldset>
      <fieldset className="admin-box space-y-4">
        <legend className={h}>Email, links and search engines</legend>
        <AField
          label="Email sender"
          name="emailSender"
          defaultValue={s.emailSender}
          hint="Name <address>, on a domain verified in Resend."
          required
        />
        <AText
          label="Social links"
          name="social"
          rows={3}
          defaultValue={s.social.map((l) => `${l.label} | ${l.url}`).join("\n")}
          hint="One per line: Label | https://…"
        />
        <AText
          label="Default description for search engines"
          name="seoDescription"
          rows={3}
          maxLength={300}
          defaultValue={s.seo.description}
        />
        <ACheck
          name="showBoardTerms"
          defaultChecked={s.showBoardTerms}
          label="Show board members’ terms on the Editorial Board page"
        />
      </fieldset>
    </AdminForm>
  );
}

export function FlagToggles({ flags }: { flags: { key: string; description: string; enabled: boolean }[] }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  return (
    <ul className="divide-rule divide-y">
      {flags.map((f) => (
        <li key={f.key} className="flex items-center justify-between gap-4 py-3">
          <span className="text-[0.9rem]">
            {f.description}
            <span className="text-muted block font-mono text-[0.74rem]">{f.key}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={f.enabled}
            aria-label={f.description}
            disabled={pending && busy === f.key}
            onClick={() => {
              setBusy(f.key);
              start(async () => {
                const r = await setFlag(f.key, !f.enabled);
                toast(r.message, r.ok ? "info" : "error");
                router.refresh();
              });
            }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${f.enabled ? "bg-brand" : "bg-rule"}`}
          >
            <span
              aria-hidden="true"
              className={`bg-surface absolute top-0.5 left-0.5 size-5 rounded-full shadow transition-transform ${f.enabled ? "translate-x-5" : ""}`}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}
