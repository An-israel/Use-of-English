"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toaster";
import { deleteFilter, saveFilter } from "@/app/admin/submissions/actions";

/** Named filters for a list page, private to each staff member. */
export function SavedFilters({
  scope,
  base,
  query,
  filters,
}: {
  scope: "submissions" | "articles";
  base: string;
  /** the current query string, without "?" */
  query: string;
  filters: { id: string; name: string; query: string }[];
}) {
  const [naming, setNaming] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[0.84rem]">
      <span className="smallcaps text-muted text-[0.74rem]">Saved</span>
      {filters.map((f) => (
        <span key={f.id} className="border-rule bg-surface inline-flex items-center rounded-full border">
          <Link href={`${base}?${f.query}`} className="py-1 pr-1 pl-3 hover:underline">
            {f.name}
          </Link>
          <button
            type="button"
            aria-label={`Remove saved filter ${f.name}`}
            className="text-muted hover:text-accent px-2 py-1"
            onClick={() =>
              start(async () => {
                const r = await deleteFilter(f.id);
                toast(r.message, r.ok ? "info" : "error");
                router.refresh();
              })
            }
          >
            ×
          </button>
        </span>
      ))}
      {!filters.length && !naming && <span className="text-muted">none yet</span>}
      {query &&
        (naming ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              start(async () => {
                const r = await saveFilter(data);
                toast(r.message, r.ok ? "info" : "error");
                if (r.ok) {
                  setNaming(false);
                  router.refresh();
                }
              });
            }}
          >
            <input type="hidden" name="scope" value={scope} />
            <input type="hidden" name="query" value={query} />
            <input
              name="name"
              autoFocus
              required
              maxLength={80}
              aria-label="Filter name"
              placeholder="Name this filter"
              className="admin-input mt-0 w-44 py-1"
            />
            <button type="submit" className="btn-line py-1" disabled={pending}>
              Save
            </button>
            <button type="button" className="btn-quiet py-1" onClick={() => setNaming(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="text-thread-text font-medium hover:underline"
            onClick={() => setNaming(true)}
          >
            + Save current filter
          </button>
        ))}
    </div>
  );
}
