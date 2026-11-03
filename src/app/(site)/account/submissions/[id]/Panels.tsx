"use client";

import { FileDrop } from "@/components/ui/FileDrop";
import { useActionState, useState } from "react";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FEE_INTEGRITY_STATEMENT } from "@/content/journal";
import { formatNaira } from "@/lib/format";
import { startPayment, type PayState } from "@/lib/payments/actions";
import { FILE_KINDS, MAX_FILE_BYTES } from "@/lib/submission";
import { browserClient } from "@/lib/supabase/browser";
import { registerRevision, requestRevisionUpload, sendMessage, withdraw } from "./actions";

export function PayFee({ id, fee, amountKobo }: { id: string; fee: "review" | "publication"; amountKobo: number }) {
  const [state, action] = useActionState<PayState, FormData>(startPayment, { status: "idle" });
  return (
    <div className="border-thread bg-surface rounded-[3px] border-2 p-6">
      <p className="smallcaps text-thread-text text-[0.8rem]">Payment due</p>
      <p className="font-display mt-2 text-[1.5rem]">
        {fee === "review" ? "Review and plagiarism-check fee" : "Publication fee"}
      </p>
      <p className="tabular font-display mt-1 text-[2rem]">{formatNaira(amountKobo)}</p>
      <p className="text-muted mt-2 text-[0.92rem]">Card, bank transfer or USSD, through Paystack.</p>
      <p className="mt-3 text-[0.92rem] italic">{FEE_INTEGRITY_STATEMENT}</p>
      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="submissionId" value={id} />
        <input type="hidden" name="fee" value={fee} />
        <FormMessage status={state.status} message={state.message} />
        <SubmitButton pendingLabel="Opening Paystack…">
          {fee === "review" ? "Pay review fee" : "Pay publication fee"}
        </SubmitButton>
      </form>
    </div>
  );
}

export function RevisionUpload({ id }: { id: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<{ status: "idle" | "ok" | "error"; message?: string }>({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!file) return setState({ status: "error", message: "Choose the revised manuscript first." });
    if (file.size > MAX_FILE_BYTES) return setState({ status: "error", message: "Files must be smaller than 20 MB." });
    setBusy(true);
    const t = await requestRevisionUpload(id, { name: file.name, size: file.size, type: file.type });
    if (!t.ok) return (setBusy(false), setState({ status: "error", message: t.message }));
    const { error } = await browserClient()
      .storage.from("submissions")
      .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
    if (error)
      return (setBusy(false), setState({ status: "error", message: "The upload was interrupted. Please try again." }));
    const r = await registerRevision(id, t.path, file.name, note);
    setBusy(false);
    setState(r.ok ? { status: "ok", message: r.message } : { status: "error", message: r.message });
  };
  return (
    <div className="border-thread bg-surface rounded-[3px] border-2 p-6">
      <p className="smallcaps text-thread-text text-[0.8rem]">Action needed</p>
      <p className="font-display mt-2 text-[1.4rem]">Upload your revised manuscript</p>
      <p className="text-muted mt-1 text-[0.92rem]">{FILE_KINDS.revision.hint}</p>
      <div className="mt-5 space-y-4">
        <FileDrop
          label="Revised manuscript"
          accept={FILE_KINDS.revision.types.join(",")}
          file={file}
          onFile={setFile}
          disabled={busy}
        />
        <label className="block text-[0.92rem]">
          Response to the reviewers (optional)
          <textarea
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="border-rule bg-bg mt-1.5 w-full rounded-sm border px-3.5 py-3"
          />
        </label>
        <FormMessage status={state.status} message={state.message} />
        <button
          type="button"
          onClick={send}
          disabled={busy || state.status === "ok"}
          className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3 font-medium disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Send revised manuscript"}
        </button>
      </div>
    </div>
  );
}

export function MessageForm({ id }: { id: string }) {
  const [state, action] = useActionState(sendMessage, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label className="block text-[0.92rem]">
        Write to the editorial office
        <textarea
          name="message"
          rows={3}
          className="border-rule bg-surface mt-1.5 w-full rounded-sm border px-3.5 py-3"
        />
      </label>
      {state && <FormMessage status={state.ok ? "ok" : "error"} message={state.message} />}
      <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  );
}

export function WithdrawForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(withdraw, null);
  if (state?.ok) return <FormMessage status="ok" message={state.message} />;
  return open ? (
    <form action={action} className="border-accent/40 space-y-3 rounded-[3px] border p-5">
      <input type="hidden" name="id" value={id} />
      <p className="text-[0.92rem]">
        Withdrawing ends the review of this manuscript. Fees already paid are handled under the refund policy.
      </p>
      <label className="block text-[0.92rem]">
        Reason (optional)
        <textarea
          name="reason"
          rows={2}
          className="border-rule bg-surface mt-1.5 w-full rounded-sm border px-3.5 py-3"
        />
      </label>
      {state && !state.ok && <FormMessage status="error" message={state.message} />}
      <div className="flex gap-3">
        <SubmitButton pendingLabel="Withdrawing…" className="!bg-accent">
          Withdraw submission
        </SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="text-muted px-4">
          Cancel
        </button>
      </div>
    </form>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="text-muted decoration-rule hover:text-accent text-[0.9rem] underline underline-offset-4"
    >
      Withdraw this submission
    </button>
  );
}
