"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";

const submit = "px-4 py-2 text-[0.9rem]";
import { STATUS_LABEL, type SubmissionStatus } from "@/lib/workflow";
import { addNote, changeStatus, waiveFee } from "../actions";

const box = "admin-box";
const field = "admin-input";

export function StatusControl({ id, moves }: { id: string; moves: SubmissionStatus[] }) {
  const [state, action] = useActionState(changeStatus, null);
  const [to, setTo] = useState<string>(moves[0] ?? "");
  if (!moves.length) return <p className={`${box} text-muted`}>No further status changes are available.</p>;
  return (
    <form action={action} className={`${box} space-y-4`}>
      <h3 className="font-display text-[1.15rem]">Change status</h3>
      <input type="hidden" name="id" value={id} />
      <label className="admin-label">
        New status
        <select name="to" value={to} onChange={(e) => setTo(e.target.value)} className={field}>
          {moves.map((m) => (
            <option key={m} value={m}>
              {STATUS_LABEL[m]}
            </option>
          ))}
        </select>
      </label>
      {to === "rejected" && (
        <label className="admin-label">
          Reason for rejection (shown to the author)
          <textarea name="reason" rows={3} required className={field} />
        </label>
      )}
      <label className="admin-label">
        Message to the author (optional, emailed)
        <textarea name="message" rows={3} className={field} />
      </label>
      {state && <FormMessage status={state.ok ? "ok" : "error"} message={state.message} />}
      <SubmitButton pendingLabel="Saving…" className={submit}>
        Update status
      </SubmitButton>
    </form>
  );
}

export function NoteControl({ id }: { id: string }) {
  const [state, action] = useActionState(addNote, null);
  return (
    <form action={action} className={`${box} space-y-4`}>
      <h3 className="font-display text-[1.15rem]">Message or note</h3>
      <input type="hidden" name="id" value={id} />
      <textarea name="message" rows={3} aria-label="Message" className={field} />
      <fieldset className="flex flex-wrap gap-5 text-[0.92rem]">
        <legend className="sr-only">Who can see it</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="visibility" value="author" defaultChecked className="accent-[var(--brand)]" /> Send
          to author
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="visibility" value="internal" className="accent-[var(--brand)]" /> Internal note
        </label>
      </fieldset>
      {state && <FormMessage status={state.ok ? "ok" : "error"} message={state.message} />}
      <SubmitButton pendingLabel="Saving…" className={submit}>
        Save
      </SubmitButton>
    </form>
  );
}

export function WaiveControl({ id, fees }: { id: string; fees: ("review" | "publication")[] }) {
  const [state, action] = useActionState(waiveFee, null);
  if (!fees.length) return null;
  return (
    <form action={action} className={`${box} space-y-4`}>
      <h3 className="font-display text-[1.15rem]">Waive a fee</h3>
      <input type="hidden" name="id" value={id} />
      <label className="admin-label">
        Fee
        <select name="fee" className={field}>
          {fees.map((f) => (
            <option key={f} value={f}>
              {f === "review" ? "Review fee" : "Publication fee"}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-label">
        Reason (kept on record)
        <textarea name="reason" rows={2} required className={field} />
      </label>
      {state && <FormMessage status={state.ok ? "ok" : "error"} message={state.message} />}
      <SubmitButton pendingLabel="Saving…" className={submit}>
        Waive fee
      </SubmitButton>
    </form>
  );
}
