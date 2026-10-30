"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ACheck, AdminForm, AField, ASelect, AText, useUnsavedChanges } from "@/components/admin/AdminForm";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { useToast } from "@/components/ui/Toaster";
import { ARTICLE_TYPE_LABEL } from "@/lib/types";
import { assignToIssue } from "../../issues/actions";
import { saveArticle, saveAuthors, saveBookDetails, saveFullText, scheduleArticle, type AuthorInput } from "../actions";

export type ArticleFormValues = {
  id: string;
  version: number;
  title: string;
  slug: string;
  type: string;
  category_id: string;
  abstract: string;
  keywords: string;
  first_page: string;
  last_page: string;
  doi: string;
  licence: string;
  citation_style: string;
  received_at: string;
  accepted_at: string;
};

export function ArticleDetailsForm({
  values,
  categories,
  bookOnly,
}: {
  values: ArticleFormValues;
  categories: { value: string; label: string }[];
  bookOnly: boolean;
}) {
  const types = Object.entries(ARTICLE_TYPE_LABEL)
    .filter(([k]) => !bookOnly || k === "book_review")
    .map(([value, label]) => ({ value, label }));
  return (
    <AdminForm action={saveArticle}>
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="version" value={values.version} />
      <AField label="Title" name="title" defaultValue={values.title} required maxLength={300} />
      <div className="grid gap-4 sm:grid-cols-2">
        <AField
          label="URL slug"
          name="slug"
          defaultValue={values.slug}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          hint="/articles/… — changing it keeps old links working."
        />
        <ASelect label="Type" name="type" defaultValue={values.type} options={types} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ASelect
          label="Subject"
          name="category_id"
          defaultValue={values.category_id}
          options={[{ value: "", label: "None" }, ...categories]}
        />
        <AField label="Keywords" name="keywords" defaultValue={values.keywords} hint="Separate with commas." />
      </div>
      <AText label="Abstract" name="abstract" rows={7} defaultValue={values.abstract} maxLength={5000} />
      <div className="grid gap-4 sm:grid-cols-4">
        <AField label="First page" name="first_page" type="number" min={1} defaultValue={values.first_page} />
        <AField label="Last page" name="last_page" type="number" min={1} defaultValue={values.last_page} />
        <AField
          className="sm:col-span-2"
          label="DOI"
          name="doi"
          defaultValue={values.doi}
          placeholder="10.xxxxx/jhts…"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <AField label="Received" name="received_at" type="date" defaultValue={values.received_at} />
        <AField label="Accepted" name="accepted_at" type="date" defaultValue={values.accepted_at} />
        <AField label="Licence" name="licence" defaultValue={values.licence} required />
        <ASelect
          label="Citation style"
          name="citation_style"
          defaultValue={values.citation_style}
          options={[
            { value: "", label: "Not set" },
            { value: "apa7", label: "APA 7th" },
            { value: "mla9", label: "MLA 9th" },
          ]}
        />
      </div>
    </AdminForm>
  );
}

const EMPTY: AuthorInput = {
  name: "",
  affiliation: "",
  email: "",
  orcid: "",
  isCorresponding: false,
  emailPublic: false,
};

/** Authors in citation order: add, remove, reorder, then save the whole list. */
export function AuthorsEditor({ articleId, initial }: { articleId: string; initial: AuthorInput[] }) {
  const [list, setList] = useState<AuthorInput[]>(initial.length ? initial : [EMPTY]);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  useUnsavedChanges(dirty);
  const update = (i: number, patch: Partial<AuthorInput>) => {
    setDirty(true);
    setList((l) =>
      l.map((a, j) => (j === i ? { ...a, ...patch } : patch.isCorresponding ? { ...a, isCorresponding: false } : a)),
    );
  };
  const move = (i: number, d: -1 | 1) => {
    setDirty(true);
    setList((l) => {
      const n = l.slice();
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  };
  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {list.map((a, i) => (
          <li key={i} className="border-rule rounded-[2px] border p-3">
            <fieldset>
              <legend className="sr-only">Author {i + 1}</legend>
              <div className="flex items-center justify-between gap-2">
                <span className="smallcaps text-muted text-[0.74rem]">Author {i + 1}</span>
                <div className="flex">
                  <button
                    type="button"
                    className="btn-quiet px-2"
                    aria-label={`Move author ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-quiet px-2"
                    aria-label={`Move author ${i + 1} down`}
                    disabled={i === list.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn-quiet px-2"
                    aria-label={`Remove author ${i + 1}`}
                    disabled={list.length === 1}
                    onClick={() => {
                      setDirty(true);
                      setList((l) => l.filter((_, j) => j !== i));
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <AField label="Name" value={a.name} onChange={(e) => update(i, { name: e.target.value })} required />
                <AField
                  label="Affiliation"
                  value={a.affiliation}
                  onChange={(e) => update(i, { affiliation: e.target.value })}
                />
                <AField
                  label="Email"
                  type="email"
                  value={a.email}
                  onChange={(e) => update(i, { email: e.target.value })}
                />
                <AField
                  label="ORCID iD"
                  value={a.orcid}
                  placeholder="0000-0000-0000-0000"
                  onChange={(e) => update(i, { orcid: e.target.value })}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-5">
                <ACheck
                  label="Corresponding author"
                  checked={a.isCorresponding}
                  onChange={(e) => update(i, { isCorresponding: e.target.checked })}
                />
                <ACheck
                  label="Show email publicly"
                  checked={a.emailPublic}
                  onChange={(e) => update(i, { emailPublic: e.target.checked })}
                />
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveAuthors(articleId, list);
              toast(r.message, r.ok ? "info" : "error");
              if (r.ok) {
                setDirty(false);
                router.refresh();
              }
            })
          }
        >
          {pending ? "Saving…" : "Save authors"}
        </button>
        <button
          type="button"
          className="btn-line"
          onClick={() => {
            setDirty(true);
            setList((l) => [...l, EMPTY]);
          }}
        >
          Add author
        </button>
        {dirty && <span className="text-muted text-[0.82rem]">Unsaved changes</span>}
      </div>
    </div>
  );
}

export function FullTextForm({ id, version, html }: { id: string; version: number; html: string }) {
  return (
    <AdminForm action={saveFullText} submitLabel="Save full text">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="version" value={version} />
      <RichTextEditor
        name="body_html"
        label="Full text (HTML)"
        initialHtml={html}
        placeholder="Paste the article from Word: headings, italics, lists and links are kept; Word’s formatting is cleaned up."
      />
    </AdminForm>
  );
}

export function BookDetailsForm({
  articleId,
  values,
}: {
  articleId: string;
  values: { book_title: string; book_author: string; publisher: string; year: string; isbn: string; pages: string };
}) {
  return (
    <AdminForm action={saveBookDetails} submitLabel="Save book details">
      <input type="hidden" name="article_id" value={articleId} />
      <AField label="Book title" name="book_title" defaultValue={values.book_title} required />
      <AField label="Book author(s)" name="book_author" defaultValue={values.book_author} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="Publisher" name="publisher" defaultValue={values.publisher} />
        <AField label="Year" name="year" type="number" min={1500} max={2100} defaultValue={values.year} />
        <AField label="ISBN" name="isbn" defaultValue={values.isbn} />
        <AField label="Pages" name="pages" type="number" min={1} defaultValue={values.pages} />
      </div>
    </AdminForm>
  );
}

export function ScheduleArticleForm({ id, defaultAt }: { id: string; defaultAt: string }) {
  return (
    <AdminForm action={scheduleArticle} submitLabel="Schedule" guard={false}>
      <input type="hidden" name="id" value={id} />
      <AField label="Go online on (Lagos time)" name="at" type="datetime-local" defaultValue={defaultAt} required />
    </AdminForm>
  );
}

/** Move an article into an issue (or back to In Press). */
export function IssuePicker({
  articleId,
  current,
  issues,
}: {
  articleId: string;
  current: string;
  issues: { value: string; label: string }[];
}) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <ASelect
        className="min-w-[14rem] flex-1"
        label="Issue"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        options={[{ value: "", label: "No issue (Article in Press)" }, ...issues]}
      />
      <button
        type="button"
        className="btn-line"
        disabled={pending || value === current}
        onClick={() =>
          start(async () => {
            const r = await assignToIssue(articleId, value || null);
            toast(r.message, r.ok ? "info" : "error");
            if (r.ok) router.refresh();
          })
        }
      >
        Move
      </button>
    </div>
  );
}
