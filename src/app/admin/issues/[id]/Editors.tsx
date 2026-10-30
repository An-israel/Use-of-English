"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminForm, AField, ASelect } from "@/components/admin/AdminForm";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { StatusPill } from "@/components/admin/StatusPill";
import { useToast } from "@/components/ui/Toaster";
import { MONTHS } from "@/lib/issues";
import { assignToIssue, reorderArticles, saveIssue, scheduleIssue } from "../actions";

export function IssueDetailsForm({
  id,
  version,
  title,
  month,
  editorial,
}: {
  id: string;
  version: number;
  title: string;
  month: number;
  editorial: string;
}) {
  return (
    <AdminForm action={saveIssue}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <div className="grid gap-4 sm:grid-cols-3">
        <AField
          className="sm:col-span-2"
          label="Title (optional)"
          name="title"
          defaultValue={title}
          placeholder="e.g. Language and Belonging"
          maxLength={200}
        />
        <ASelect
          label="Month"
          name="month"
          defaultValue={String(month)}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
        />
      </div>
      <RichTextEditor name="editorial" label="Editorial" initialHtml={editorial} placeholder="The issue’s editorial…" />
    </AdminForm>
  );
}

export function ScheduleForm({ id, defaultAt }: { id: string; defaultAt: string }) {
  return (
    <AdminForm action={scheduleIssue} submitLabel="Schedule" guard={false}>
      <input type="hidden" name="id" value={id} />
      <AField label="Publish on (Lagos time)" name="at" type="datetime-local" defaultValue={defaultAt} required />
    </AdminForm>
  );
}

type Row = { id: string; title: string; status: string; type: string; pages: string };

/** The issue's table of contents: move articles up or down, take them out, add more. */
export function IssueArticles({
  issueId,
  rows,
  candidates,
}: {
  issueId: string;
  rows: Row[];
  candidates: { id: string; title: string; status: string }[];
}) {
  const [order, setOrder] = useState(rows);
  const [saved, setSaved] = useState(rows);
  const [pick, setPick] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  // New server data (after add/remove) replaces local order.
  if (rows !== saved) {
    setSaved(rows);
    setOrder(rows);
  }
  const changed = order.map((r) => r.id).join() !== rows.map((r) => r.id).join();
  const move = (i: number, d: -1 | 1) => {
    const next = order.slice();
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setOrder(next);
  };
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      toast(r.message, r.ok ? "info" : "error");
      if (r.ok) router.refresh();
    });

  return (
    <div>
      {!order.length ? (
        <p className="text-muted text-[0.9rem]">No articles in this issue yet.</p>
      ) : (
        <ol className="divide-rule border-rule divide-y rounded-[2px] border">
          {order.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="tabular text-muted w-6 text-right text-[0.85rem]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/articles/${r.id}`}
                  className="line-clamp-2 text-[0.92rem] font-medium hover:underline"
                >
                  {r.title}
                </Link>
                <span className="text-muted text-[0.78rem]">
                  {r.type}
                  {r.pages ? ` · ${r.pages}` : ""}
                </span>
              </div>
              <StatusPill status={r.status} />
              <div className="flex shrink-0">
                <button
                  type="button"
                  className="btn-quiet px-2"
                  aria-label={`Move “${r.title}” up`}
                  disabled={i === 0 || pending}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn-quiet px-2"
                  aria-label={`Move “${r.title}” down`}
                  disabled={i === order.length - 1 || pending}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn-quiet px-2"
                  aria-label={`Remove “${r.title}” from the issue`}
                  disabled={pending}
                  onClick={() => run(() => assignToIssue(r.id, null))}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {changed && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => run(() => reorderArticles(order.map((r) => r.id)))}
          >
            Save order
          </button>
          <button type="button" className="btn-quiet" onClick={() => setOrder(rows)}>
            Undo
          </button>
        </div>
      )}
      {candidates.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="admin-label min-w-[16rem] flex-1">
            Add an article (Articles in Press and drafts without an issue)
            <select className="admin-input" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Choose…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.status === "in_press" ? "In Press" : c.status})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn-line"
            disabled={!pick || pending}
            onClick={() => {
              run(() => assignToIssue(pick, issueId));
              setPick("");
            }}
          >
            Add to issue
          </button>
        </div>
      )}
    </div>
  );
}
