"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ASSET_SLOTS, publicFileUrl, type AssetSlotKey } from "@/lib/admin/assets";
import { browserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/Toaster";
import { clearAsset, commitAsset, requestAssetUpload } from "@/app/admin/asset-actions";
import { ConfirmDialog } from "./ConfirmDialog";

/** Upload or replace one file slot (cover, PDF, DOCX, photo). Previous versions are kept. */
export function AssetUpload({
  slot,
  id,
  current,
  clearLabel,
  preview,
}: {
  slot: AssetSlotKey;
  id: string;
  current: string | null;
  /** Offer to detach the file, e.g. "Use the generated cover". */
  clearLabel?: string;
  /** Show an image preview of the current file. */
  preview?: boolean;
}) {
  const spec = ASSET_SLOTS[slot];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const toast = useToast();
  const router = useRouter();
  const url = publicFileUrl(spec.bucket, current);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!(spec.types as readonly string[]).includes(file.type)) return setError("That file type isn’t accepted.");
    if (file.size > spec.maxMb * 1024 * 1024) return setError(`Files must be smaller than ${spec.maxMb} MB.`);
    setBusy(true);
    try {
      const ticket = await requestAssetUpload(slot, id, { name: file.name, size: file.size, type: file.type });
      if (!ticket.ok) return setError(ticket.message);
      const { error: up } = await browserClient()
        .storage.from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
          // File names are versioned, so a stored file never changes: cache it for a year (item 49).
          cacheControl: "31536000",
        });
      if (up) return setError("The upload was interrupted. Please try again.");
      const r = await commitAsset(slot, id, ticket.path);
      if (!r.ok) return setError(r.message);
      toast(r.message);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border-rule rounded-[2px] border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.9rem] font-medium">{spec.label}</p>
          <p className="text-muted truncate text-[0.8rem]">
            {current ? (
              <a href={url ?? "#"} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {current
                  .split("/")
                  .pop()
                  ?.replace(/^v[0-9a-z]+-/, "")}
              </a>
            ) : (
              "No file yet"
            )}{" "}
            · up to {spec.maxMb} MB
          </p>
        </div>
        <div className="flex items-center gap-2">
          {current && clearLabel && (
            <ConfirmDialog
              title={clearLabel}
              description="The current file is kept in the version history."
              confirmLabel={clearLabel}
              trigger={
                <button type="button" className="btn-quiet">
                  {clearLabel}
                </button>
              }
              onConfirm={async () => {
                const r = await clearAsset(slot, id);
                toast(r.message, r.ok ? "info" : "error");
                router.refresh();
              }}
            />
          )}
          <label htmlFor={inputId} className="btn-line cursor-pointer">
            {busy ? "Uploading…" : current ? "Replace" : "Upload"}
          </label>
          <input
            id={inputId}
            type="file"
            className="sr-only"
            accept={spec.types.join(",")}
            disabled={busy}
            aria-label={`${current ? "Replace" : "Upload"} ${spec.label}`}
            onChange={(e) => {
              void pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {preview && url && (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview of a just-uploaded file
        <img src={url} alt="" className="border-rule mt-3 max-h-48 rounded-[2px] border object-contain" />
      )}
      {error && (
        <p role="alert" className="text-accent mt-2 text-[0.85rem]">
          {error}
        </p>
      )}
    </div>
  );
}
