"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormMessage } from "@/components/forms/FormMessage";
import { FileDrop } from "@/components/ui/FileDrop";
import { FEE_INTEGRITY_STATEMENT } from "@/content/journal";
import { formatDate, formatNaira } from "@/lib/format";
import { requestProofUpload, submitBankTransfer } from "@/lib/payments/actions";
import { PROOF_ACCEPT, PROOF_MAX_BYTES, type TransferState } from "@/lib/payments/bank";
import { browserClient } from "@/lib/supabase/browser";

export type BankAccount = { accountName: string; accountNumber: string; bankName: string };

const FEE_NAME = { review: "Review and plagiarism-check fee", publication: "Publication fee" } as const;
const input = "border-rule bg-bg mt-1.5 w-full rounded-sm border px-3.5 py-2.5";

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // Clipboard blocked: the text is on screen to copy by hand.
        }
      }}
      className="text-brand hover:text-brand-hover text-[0.82rem] font-medium underline underline-offset-4"
      aria-label={`Copy ${label}`}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

/**
 * How to pay a fee by bank transfer, and the form for the transfer receipt.
 * Used after submitting (review fee) and after acceptance (publication fee).
 */
export function BankTransferPay({
  submissionId,
  publicId,
  fee,
  amountKobo,
  bank,
  state,
  defaultPayer,
  today,
}: {
  submissionId: string;
  publicId: string;
  fee: "review" | "publication";
  amountKobo: number;
  bank: BankAccount;
  state: TransferState;
  defaultPayer: string;
  today: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [payer, setPayer] = useState(defaultPayer);
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [replace, setReplace] = useState(false);
  const [msg, setMsg] = useState<{ status: "idle" | "ok" | "error"; message?: string }>({ status: "idle" });

  const send = async () => {
    if (!payer.trim()) return setMsg({ status: "error", message: "Enter the name the transfer was made in." });
    if (!date) return setMsg({ status: "error", message: "Enter the date of the transfer." });
    if (!file) return setMsg({ status: "error", message: "Choose the transfer receipt or bank teller to upload." });
    if (file.size > PROOF_MAX_BYTES)
      return setMsg({ status: "error", message: "The receipt must be smaller than 5 MB." });
    setBusy(true);
    setMsg({ status: "idle" });
    const t = await requestProofUpload(submissionId, fee, { name: file.name, size: file.size, type: file.type });
    if (!t.ok) return (setBusy(false), setMsg({ status: "error", message: t.message }));
    const { error } = await browserClient()
      .storage.from("finance")
      .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
    if (error)
      return (setBusy(false), setMsg({ status: "error", message: "The upload was interrupted. Please try again." }));
    const r = await submitBankTransfer({
      submissionId,
      fee,
      path: t.path,
      originalName: file.name,
      payer,
      transferDate: date,
    });
    setBusy(false);
    setMsg({ status: r.ok ? "ok" : "error", message: r.message });
    if (r.ok) {
      setFile(null);
      setReplace(false);
      router.refresh();
    }
  };

  const details: [string, string, boolean][] = [
    ["Account name", bank.accountName, false],
    ["Account number", bank.accountNumber, true],
    ["Bank", bank.bankName, false],
    ["Amount", formatNaira(amountKobo), false],
    ["Description", publicId, true],
  ];

  return (
    <div className="border-thread bg-surface rounded-[3px] border-2 p-6" data-testid="bank-transfer">
      <p className="smallcaps text-thread-text text-[0.8rem]">
        {state.kind === "awaiting" ? "Payment being confirmed" : "Payment due"}
      </p>
      <p className="font-display mt-2 text-[1.5rem]">{FEE_NAME[fee]}</p>
      <p className="tabular font-display mt-1 text-[2rem]">{formatNaira(amountKobo)}</p>

      {state.kind === "awaiting" && (
        <div className="border-brand/30 bg-brand/5 mt-4 rounded-sm border px-4 py-3 text-[0.92rem]" role="status">
          <p>
            <strong>We have your receipt</strong> (sent {formatDate(state.submittedAt)}, transfer by {state.payer} on{" "}
            {formatDate(state.transferDate)}). The Finance Officer will confirm it once the money shows in the journal’s
            account. We will email you, and your official receipt, as soon as it is confirmed.
          </p>
          {!replace && (
            <button
              type="button"
              onClick={() => setReplace(true)}
              className="text-brand mt-2 text-[0.86rem] font-medium underline underline-offset-4"
            >
              Upload a different receipt
            </button>
          )}
        </div>
      )}
      {state.kind === "rejected" && (
        <p className="border-accent/40 bg-accent/5 mt-4 rounded-sm border px-4 py-3 text-[0.92rem]" role="alert">
          <strong>We couldn’t confirm your last payment:</strong> {state.reason} Please check the details below and
          upload the receipt again.
        </p>
      )}

      {(state.kind !== "awaiting" || replace) && (
        <>
          <h3 className="font-display mt-6 text-[1.15rem]">Pay by bank transfer</h3>
          <ol className="text-muted mt-2 list-decimal space-y-1 pl-5 text-[0.92rem]">
            <li>Transfer the fee to the account below, from any bank, by app, internet banking or over the counter.</li>
            <li>
              Write your submission ID, <strong className="text-fg tabular">{publicId}</strong>, in the transfer
              description (or on the teller), so we can match your payment.
            </li>
            <li>Upload the transfer receipt or bank teller below.</li>
          </ol>
          <dl className="border-rule bg-bg mt-4 divide-y divide-[var(--rule)] rounded-sm border text-[0.95rem]">
            {details.map(([k, v, copy]) => (
              <div key={k} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="flex items-center gap-3">
                  <span className="tabular text-fg font-medium">{v}</span>
                  {copy && <Copy text={v} label={k.toLowerCase()} />}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[0.92rem]">
                Name the transfer was made in
                <input
                  value={payer}
                  onChange={(e) => setPayer(e.target.value)}
                  autoComplete="name"
                  className={input}
                  disabled={busy}
                />
              </label>
              <label className="block text-[0.92rem]">
                Date of the transfer
                <input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value)}
                  className={input}
                  disabled={busy}
                />
              </label>
            </div>
            <FileDrop
              label="Transfer receipt or bank teller"
              hint="PDF, JPG, PNG or WebP, up to 5 MB. A clear photo or screenshot is fine."
              accept={PROOF_ACCEPT}
              file={file}
              onFile={setFile}
              disabled={busy}
            />
            <FormMessage status={msg.status} message={msg.message} />
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3 font-medium disabled:opacity-60"
            >
              {busy ? "Sending…" : "Send proof of payment"}
            </button>
          </div>
        </>
      )}
      {state.kind === "awaiting" && !replace && msg.status === "ok" && (
        <div className="mt-4">
          <FormMessage status="ok" message={msg.message} />
        </div>
      )}
      <p className="mt-5 text-[0.88rem] italic">{FEE_INTEGRITY_STATEMENT}</p>
    </div>
  );
}
