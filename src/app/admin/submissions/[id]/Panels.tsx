"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { AdminForm, AField, ASelect } from "@/components/admin/AdminForm";
import { useToast } from "@/components/ui/Toaster";
import { browserClient } from "@/lib/supabase/browser";
import { MAX_FILE_BYTES, STAFF_FILE_KINDS, type StaffUploadKind } from "@/lib/submission";
import { inviteReviewer, registerStaffUpload, requestStaffUpload, saveEditorial } from "../review-actions";

export type ReviewerOption = {
  id: string;
  name: string;
  email: string;
  expertise: string[];
  load: number;
  role: string;
};

export function InviteReviewer({
  id,
  reviewers,
  round,
  defaultDue,
}: {
  id: string;
  reviewers: ReviewerOption[];
  round: number;
  defaultDue: string;
}) {
  const [pick, setPick] = useState("");
  const chosen = reviewers.find((r) => r.id === pick);
  if (!reviewers.length)
    return (
      <p className="text-muted text-[0.88rem]">
        No reviewers yet. Invite people with the Reviewer role from Users and roles.
      </p>
    );
  return (
    <AdminForm action={inviteReviewer} submitLabel="Invite reviewer" resetOnSave guard={false}>
      <input type="hidden" name="id" value={id} />
      <ASelect
        label="Reviewer"
        name="reviewer"
        value={pick}
        onChange={(e) => setPick(e.target.value)}
        required
        options={[
          { value: "", label: "Choose a reviewer…" },
          ...reviewers.map((r) => ({
            value: r.id,
            label: `${r.name}${r.role !== "reviewer" ? " (editor)" : ""} · ${r.email} · ${r.load} active`,
          })),
        ]}
      />
      {chosen && (
        <p className="text-muted -mt-2 text-[0.8rem]">
          Expertise: {chosen.expertise.length ? chosen.expertise.join(", ") : "not recorded"}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <AField label="Due date" name="due" type="date" defaultValue={defaultDue} required />
        <AField label="Round" name="round" type="number" min={1} max={9} defaultValue={round} required />
      </div>
    </AdminForm>
  );
}

export function EditorialDetails({
  id,
  version,
  similarity,
  receivedAt,
  acceptedAt,
  handlingEditor,
  editors,
}: {
  id: string;
  version: number;
  similarity: number | null;
  receivedAt: string | null;
  acceptedAt: string | null;
  handlingEditor: string | null;
  editors: { id: string; name: string }[];
}) {
  return (
    <AdminForm action={saveEditorial} submitLabel="Save details">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <AField
        label="Similarity (%)"
        name="similarity"
        type="number"
        min={0}
        max={100}
        step={0.1}
        defaultValue={similarity ?? ""}
        hint="From the plagiarism check. Never shown to the author."
      />
      <div className="grid grid-cols-2 gap-3">
        <AField label="Received" name="received_at" type="date" defaultValue={receivedAt ?? ""} />
        <AField label="Accepted" name="accepted_at" type="date" defaultValue={acceptedAt ?? ""} />
      </div>
      <ASelect
        label="Handling editor"
        name="handling_editor"
        defaultValue={handlingEditor ?? ""}
        options={[{ value: "", label: "Not assigned" }, ...editors.map((e) => ({ value: e.id, label: e.name }))]}
      />
    </AdminForm>
  );
}

export function StaffUpload({ id, kind }: { id: string; kind: StaffUploadKind }) {
  const spec = STAFF_FILE_KINDS[kind];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const toast = useToast();
  const router = useRouter();
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!(spec.types as readonly string[]).includes(file.type)) return setError(spec.hint);
    if (file.size > MAX_FILE_BYTES) return setError("Files must be smaller than 20 MB.");
    setBusy(true);
    try {
      const t = await requestStaffUpload(id, kind, { name: file.name, size: file.size, type: file.type });
      if (!t.ok) return setError(t.message);
      const { error: up } = await browserClient()
        .storage.from("submissions")
        .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
      if (up) return setError("The upload was interrupted. Please try again.");
      const r = await registerStaffUpload(id, kind, t.path, file.name);
      if (!r.ok) return setError(r.message);
      toast(r.message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex flex-col items-start gap-2">
        <div>
          <p className="text-[0.9rem] font-medium">{spec.label}</p>
          <p className="text-muted text-[0.78rem]">{spec.hint}</p>
        </div>
        <label htmlFor={inputId} className="btn-line cursor-pointer">
          {busy ? "Uploading…" : "Upload"}
        </label>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept={spec.types.join(",")}
          aria-label={`Upload ${spec.label}`}
          disabled={busy}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-accent mt-2 text-[0.85rem]">
          {error}
        </p>
      )}
    </div>
  );
}
