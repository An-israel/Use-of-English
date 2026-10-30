"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { useUnsavedChanges } from "@/components/admin/AdminForm";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { browserClient } from "@/lib/supabase/browser";
import { DOCX, MAX_FILE_BYTES, PDF, RECOMMENDATION_LABEL, type Recommendation } from "@/lib/submission";
import { registerReport, requestReportUpload, respondToInvitation, saveReview } from "../actions";

export function Respond({ id, due }: { id: string; due: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const answer = (accept: boolean) =>
    start(async () => {
      const r = await respondToInvitation(id, accept);
      setMsg(r.message);
      if (r.ok) router.refresh();
    });
  return (
    <section aria-labelledby="invite" className="border-rule bg-surface rounded-[3px] border p-6">
      <h2 id="invite" className="font-display text-[1.4rem]">
        Will you review this manuscript?
      </h2>
      <p className="text-muted mt-2 text-[0.95rem]">
        Read the abstract below. If you accept, we ask for your review by <strong className="text-fg">{due}</strong>.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className="btn-primary px-5 py-3" disabled={pending} onClick={() => answer(true)}>
          Accept and review
        </button>
        <button type="button" className="btn-line px-5 py-3" disabled={pending} onClick={() => answer(false)}>
          Decline
        </button>
      </div>
      {msg && (
        <p role="status" className="mt-4 text-[0.92rem]">
          {msg}
        </p>
      )}
    </section>
  );
}

export function ReviewForm({
  id,
  version,
  recommendation,
  toAuthor,
  toEditor,
  reports,
}: {
  id: string;
  version: number;
  recommendation: Recommendation | null;
  toAuthor: string;
  toEditor: string;
  reports: string[];
}) {
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const router = useRouter();
  const uid = useId();
  useUnsavedChanges(dirty);

  const send = (intent: "save" | "submit") => {
    const form = ref.current;
    if (!form) return false;
    const data = new FormData(form);
    data.set("intent", intent);
    return new Promise<boolean>((resolve) =>
      start(async () => {
        const r = await saveReview(data);
        setConflict(!!r.conflict);
        setError(r.ok ? null : r.message);
        if (r.ok) {
          setDirty(false);
          toast(r.message);
          router.refresh();
        }
        resolve(r.ok);
      }),
    );
  };

  return (
    <section aria-labelledby="review">
      <h2 id="review" className="font-display text-[1.5rem]">
        Your review
      </h2>
      <form
        ref={ref}
        className="mt-5 space-y-6"
        onInput={() => setDirty(true)}
        onSubmit={(e) => {
          e.preventDefault();
          void send("save");
        }}
      >
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <fieldset>
          <legend className="text-[0.95rem] font-medium">Recommendation</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(RECOMMENDATION_LABEL).map(([k, v]) => (
              <label
                key={k}
                className="border-rule bg-surface has-checked:border-fg flex items-center gap-3 rounded-sm border px-4 py-3"
              >
                <input
                  type="radio"
                  name="recommendation"
                  value={k}
                  defaultChecked={recommendation === k}
                  className="accent-[var(--brand)]"
                />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="text-[0.95rem] font-medium">Comments for the author</span>
          <span className="text-muted block text-[0.85rem]">
            Shared with the author without your name. Please don’t identify yourself.
          </span>
          <textarea
            name="to_author"
            rows={12}
            defaultValue={toAuthor}
            className="border-rule bg-surface reading mt-2 w-full rounded-sm border px-4 py-3 text-[1rem]"
          />
        </label>
        <label className="block">
          <span className="text-[0.95rem] font-medium">Confidential comments for the editors</span>
          <span className="text-muted block text-[0.85rem]">Never shared with the author.</span>
          <textarea
            name="to_editor"
            rows={5}
            defaultValue={toEditor}
            className="border-rule bg-surface reading mt-2 w-full rounded-sm border px-4 py-3 text-[1rem]"
          />
        </label>
        <ReportUpload id={id} reports={reports} inputId={`${uid}-report`} />
        {error && (
          <p role="alert" className="border-accent text-accent rounded-sm border px-4 py-3 text-[0.92rem]">
            {error}
            {conflict && (
              <button type="button" className="ml-3 underline" onClick={() => location.reload()}>
                Reload now
              </button>
            )}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmDialog
            title="Submit your review?"
            description="Once submitted, the review goes to the editors and can no longer be changed."
            confirmLabel="Submit review"
            trigger={
              <button type="button" className="btn-primary px-5 py-3" disabled={pending}>
                Submit review
              </button>
            }
            onConfirm={() => send("submit")}
          />
          <button type="submit" className="btn-line px-5 py-3" disabled={pending}>
            {pending ? "Saving…" : "Save draft"}
          </button>
          {dirty && <span className="text-muted text-[0.85rem]">Unsaved changes</span>}
        </div>
      </form>
    </section>
  );
}

function ReportUpload({ id, reports, inputId }: { id: string; reports: string[]; inputId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (![PDF, DOCX].includes(file.type)) return setError("Upload a PDF or Word (.docx) file.");
    if (file.size > MAX_FILE_BYTES) return setError("Files must be smaller than 20 MB.");
    setBusy(true);
    try {
      const t = await requestReportUpload(id, { name: file.name, size: file.size, type: file.type });
      if (!t.ok) return setError(t.message);
      const { error: up } = await browserClient()
        .storage.from("submissions")
        .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
      if (up) return setError("The upload was interrupted. Please try again.");
      const r = await registerReport(id, t.path, file.name);
      if (!r.ok) return setError(r.message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="border-rule bg-surface rounded-sm border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.95rem] font-medium">Report file (optional)</p>
          <p className="text-muted text-[0.85rem]">
            {reports.length ? `Uploaded: ${reports.join(", ")}` : "A PDF or Word file, for the editors."}
          </p>
        </div>
        <label htmlFor={inputId} className="btn-line cursor-pointer">
          {busy ? "Uploading…" : reports.length ? "Upload another" : "Upload report"}
        </label>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept=".pdf,.docx"
          disabled={busy}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-accent mt-2 text-[0.88rem]">
          {error}
        </p>
      )}
    </div>
  );
}
