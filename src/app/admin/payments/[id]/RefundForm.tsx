"use client";

import { AdminForm, AField, AText } from "@/components/admin/AdminForm";
import { recordRefund } from "../../finance-actions";

export function RefundForm({ paymentId, maxNaira, today }: { paymentId: string; maxNaira: number; today: string }) {
  return (
    <AdminForm action={recordRefund} submitLabel="Record refund" resetOnSave>
      <input type="hidden" name="payment_id" value={paymentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AField
          label="Amount (₦)"
          name="amount"
          type="number"
          min={1}
          max={maxNaira}
          step="0.01"
          defaultValue={maxNaira}
          required
        />
        <AField label="Refunded on" name="refunded_on" type="date" max={today} defaultValue={today} required />
      </div>
      <AField label="Paystack refund reference" name="reference" hint="From the Paystack dashboard, if there is one." />
      <AText label="Reason" name="reason" rows={2} required minLength={5} />
    </AdminForm>
  );
}
