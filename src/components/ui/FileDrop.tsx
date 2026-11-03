"use client";

import clsx from "clsx";
import { useId, useState } from "react";

/**
 * A file picker styled as a drop zone (I7): click or drop a file; the chosen
 * file's name and size are shown. The real input stays in the page (visually
 * hidden) so keyboards and screen readers use it as normal.
 */
export function FileDrop({
  label,
  hint,
  accept,
  file,
  onFile,
  disabled,
}: {
  label: string;
  hint?: string;
  accept?: string;
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(false);
        onFile(e.dataTransfer.files?.[0] ?? null);
      }}
      className={clsx(
        "relative rounded-[3px] border-2 border-dashed px-5 py-6 text-center transition-colors",
        over ? "border-brand bg-[color-mix(in_oklab,var(--brand)_6%,transparent)]" : "border-rule bg-bg",
        disabled && "opacity-60",
      )}
    >
      <input
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="peer sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={id}
        className={clsx(
          "block peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[var(--focus)]",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span className="font-display block text-[1.05rem]">{label}</span>
        {file ? (
          <span className="mt-2 flex items-center justify-center gap-2 text-[0.92rem]">
            <span aria-hidden="true" className="bg-brand inline-block size-1.5 rotate-45" />
            {file.name} <span className="tabular text-muted">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
          </span>
        ) : (
          <span className="text-muted mt-1 block text-[0.9rem]">Drop a file here, or choose one</span>
        )}
        <span className="border-fg/70 mt-4 inline-block rounded-sm border px-4 py-2 text-[0.9rem]">
          {file ? "Choose a different file" : "Choose file"}
        </span>
        {hint && <span className="text-muted mt-3 block text-[0.82rem]">{hint}</span>}
      </label>
    </div>
  );
}
