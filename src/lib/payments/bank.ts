/** Proof of a bank transfer: a PDF, or a photo or screenshot of the receipt or teller. */
export const PROOF_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const PROOF_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp";
export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

/** Where an author's fee stands, for the payment panel. */
export type TransferState =
  | { kind: "due" }
  | { kind: "awaiting"; reference: string; submittedAt: string; payer: string; transferDate: string }
  | { kind: "rejected"; reason: string };

type PaymentRow = {
  fee_type: string;
  status: string;
  reference: string;
  proof_submitted_at?: string | null;
  transfer_payer?: string | null;
  transfer_date?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
};

/** The state of one fee from its payment rows (newest attempt wins). */
export function transferState(rows: PaymentRow[], fee: "review" | "publication"): TransferState {
  const mine = rows
    .filter((r) => r.fee_type === fee)
    .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  const awaiting = mine.find((r) => r.status === "pending" && r.proof_submitted_at);
  if (awaiting)
    return {
      kind: "awaiting",
      reference: awaiting.reference,
      submittedAt: awaiting.proof_submitted_at!,
      payer: awaiting.transfer_payer ?? "",
      transferDate: awaiting.transfer_date ?? "",
    };
  const latest = mine[0];
  if (latest?.status === "failed" && latest.rejection_reason)
    return { kind: "rejected", reason: latest.rejection_reason };
  return { kind: "due" };
}
