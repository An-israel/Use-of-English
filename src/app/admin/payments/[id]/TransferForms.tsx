"use client";

import { AdminForm, AText } from "@/components/admin/AdminForm";
import { rejectTransfer } from "../../finance-actions";

/** Why the transfer couldn't be matched: the author sees this and can upload again. */
export function RejectTransferForm({ paymentId }: { paymentId: string }) {
  return (
    <AdminForm action={rejectTransfer} submitLabel="Not received: tell the author">
      <input type="hidden" name="payment_id" value={paymentId} />
      <AText
        label="Reason"
        name="reason"
        rows={2}
        required
        minLength={5}
        hint="For example: no transfer of this amount reached the account on that date."
      />
    </AdminForm>
  );
}
