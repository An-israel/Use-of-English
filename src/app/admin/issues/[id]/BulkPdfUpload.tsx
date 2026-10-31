"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { mapLimit, matchByName } from "@/lib/concurrency";
import { browserClient } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/Toaster";
import { commitAsset, requestAssetUpload } from "../../asset-actions";

type Article = { id: string; slug: string; title: string; hasPdf: boolean };
type Row = { file: File; articleId: string; state: "waiting" | "uploading" | "done" | "error"; message?: string };

/** Uploads at most this many files at once (item 44: backpressure). */
export const PARALLEL = 3;
const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Upload the PDFs for several articles of an issue in one go. Each file is
 * matched to an article by its name (editors can change the match), then
 * uploaded straight to Storage, three at a time, with a visible queue.
 */
export function BulkPdfUpload({ articles }: { articles: Article[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const inputId = useId();
  const toast = useToast();
  const router = useRouter();
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const pick = (files: FileList | null) => {
    if (!files) return;
    setRows(
      [...files].map((file) => ({
        file,
        articleId: matchByName(file.name, articles)?.id ?? "",
        state: file.type === "application/pdf" && file.size <= MAX_BYTES ? "waiting" : "error",
        message:
          file.type !== "application/pdf" ? "Not a PDF" : file.size > MAX_BYTES ? "Larger than 50 MB" : undefined,
      })),
    );
  };

  const start = async () => {
    setRunning(true);
    const queue = rows.map((r, i) => ({ ...r, i })).filter((r) => r.state === "waiting" && r.articleId);
    const results = await mapLimit(queue, PARALLEL, async ({ file, articleId, i }) => {
      set(i, { state: "uploading" });
      const t = await requestAssetUpload("article:pdf", articleId, {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      if (!t.ok) throw Object.assign(new Error(t.message), { i });
      const { error } = await browserClient()
        .storage.from(t.bucket)
        .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) throw Object.assign(new Error("The upload was interrupted."), { i });
      const r = await commitAsset("article:pdf", articleId, t.path);
      if (!r.ok) throw Object.assign(new Error(r.message), { i });
      set(i, { state: "done" });
    });
    results.forEach((r, k) => {
      if (r.status === "rejected") set(queue[k].i, { state: "error", message: (r.reason as Error).message });
    });
    const ok = results.filter((r) => r.status === "fulfilled").length;
    toast(
      `${ok} of ${queue.length} PDF${queue.length === 1 ? "" : "s"} uploaded.`,
      ok === queue.length ? "info" : "error",
    );
    setRunning(false);
    router.refresh();
  };

  const ready = rows.filter((r) => r.state === "waiting" && r.articleId).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={inputId} className="btn-line cursor-pointer">
          Choose PDFs…
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept="application/pdf"
          className="sr-only"
          aria-label="Choose PDFs for several articles"
          disabled={running}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="text-muted text-[0.82rem]">
          Matched to articles by file name; up to {PARALLEL} upload at once.
        </span>
      </div>
      {rows.length > 0 && (
        <>
          <ul
            className="divide-rule border-rule divide-y rounded-[2px] border text-[0.86rem]"
            aria-label="Upload queue"
          >
            {rows.map((r, i) => (
              <li
                key={`${r.file.name}-${i}`}
                className="grid gap-2 px-3 py-2 sm:grid-cols-[1fr_16rem_6rem] sm:items-center"
              >
                <span className="truncate" title={r.file.name}>
                  {r.file.name}
                </span>
                <select
                  aria-label={`Article for ${r.file.name}`}
                  className="admin-input mt-0 py-1"
                  value={r.articleId}
                  disabled={running || r.state === "done"}
                  onChange={(e) => set(i, { articleId: e.target.value })}
                >
                  <option value="">Choose the article…</option>
                  {articles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                      {a.hasPdf ? " (replace PDF)" : ""}
                    </option>
                  ))}
                </select>
                <span
                  role="status"
                  className={
                    r.state === "error"
                      ? "text-accent"
                      : r.state === "done"
                        ? "text-brand"
                        : r.state === "uploading"
                          ? "text-thread-text"
                          : "text-muted"
                  }
                >
                  {r.state === "error"
                    ? (r.message ?? "Failed")
                    : r.state === "done"
                      ? "Uploaded"
                      : r.state === "uploading"
                        ? "Uploading…"
                        : "Waiting"}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-primary" disabled={running || !ready} onClick={() => void start()}>
            {running ? "Uploading…" : `Upload ${ready} PDF${ready === 1 ? "" : "s"}`}
          </button>
        </>
      )}
    </div>
  );
}
