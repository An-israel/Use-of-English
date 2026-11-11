"use client";

import { useState } from "react";
import { AdminForm, AField, AText } from "@/components/admin/AdminForm";
import { saveCategory } from "../journal-actions";

export const THREADS = [
  "humanities",
  "language",
  "literature",
  "culture",
  "communication",
  "translation",
  "philosophy",
  "education",
  "technology",
  "politics",
  "interdisciplinary",
  "other",
];

export type CategoryValues = {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  description: string;
  thread_color: string;
};

export function CategoryForm({ values }: { values?: CategoryValues }) {
  const [colour, setColour] = useState(values?.thread_color ?? "--thread-other");
  const swatch = colour.startsWith("--") ? `var(${colour})` : colour;
  return (
    <AdminForm action={saveCategory} submitLabel={values ? "Save category" : "Add category"} resetOnSave={!values}>
      <input type="hidden" name="id" value={values?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="Name" name="name" defaultValue={values?.name} required maxLength={80} />
        <AField
          label="URL slug"
          name="slug"
          defaultValue={values?.slug}
          hint="Leave empty to make one from the name."
        />
      </div>
      <AField
        label="Short description"
        name="short_description"
        defaultValue={values?.short_description}
        maxLength={200}
      />
      <AText label="Description" name="description" rows={3} defaultValue={values?.description} maxLength={2000} />
      <fieldset>
        <legend className="admin-label">Thread colour</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {THREADS.map((t) => (
            <label key={t} title={t} className="cursor-pointer">
              <input
                type="radio"
                name="thread_pick"
                className="peer sr-only"
                checked={colour === `--thread-${t}`}
                onChange={() => setColour(`--thread-${t}`)}
                aria-label={t}
              />
              <span
                className="peer-checked:ring-fg peer-focus-visible:outline-thread block size-7 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-[var(--surface)] peer-focus-visible:outline-2"
                style={{ background: `var(--thread-${t})` }}
              />
            </label>
          ))}
          <input
            name="thread_color"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            aria-label="Thread colour value"
            className="admin-input mt-0 w-40 font-mono text-[0.82rem]"
          />
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-6 w-12 rotate-0 rounded-[2px]"
            style={{ background: swatch }}
          />
        </div>
        <p className="text-muted mt-1.5 text-[0.78rem]">
          The thread colours meet contrast rules in light and dark mode; custom hex values may not.
        </p>
      </fieldset>
    </AdminForm>
  );
}
