"use client";

import { AdminForm, AField, AText } from "@/components/admin/AdminForm";
import { reconcileNow, resolveFlag } from "../finance-actions";

export function RunForm({ defaultDate }: { defaultDate: string }) {
  return (
    <AdminForm action={reconcileNow} submitLabel="Check this day" guard={false}>
      <AField label="Day (Lagos time)" name="date" type="date" max={defaultDate} defaultValue={defaultDate} required />
    </AdminForm>
  );
}

export function ResolveForm({ id }: { id: string }) {
  return (
    <AdminForm action={resolveFlag} submitLabel="Mark resolved" guard={false} resetOnSave>
      <input type="hidden" name="id" value={id} />
      <AText
        label="What was done"
        name="note"
        rows={2}
        required
        minLength={5}
        placeholder="e.g. Webhook missed; payment applied manually after verifying on Paystack."
      />
    </AdminForm>
  );
}
