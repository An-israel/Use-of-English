"use client";

import { useState } from "react";
import { ACheck, AdminForm, AField } from "@/components/admin/AdminForm";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { savePage } from "../../journal-actions";

/**
 * Page editor with a live preview in the site's reading style. The preview
 * shows the editor's own output; the server sanitises it again on save.
 */
export function PageEditor({
  id,
  version,
  title,
  summary,
  html,
  published,
}: {
  id: string;
  version: number;
  title: string;
  summary: string;
  html: string;
  published: boolean;
}) {
  const [preview, setPreview] = useState(html);
  const [heading, setHeading] = useState(title);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <AdminForm action={savePage}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="version" value={version} />
        <AField label="Title" name="title" defaultValue={title} required onChange={(e) => setHeading(e.target.value)} />
        <AField
          label="Summary"
          name="summary"
          defaultValue={summary}
          maxLength={400}
          hint="Shown under the title and in search results."
        />
        <RichTextEditor name="body_html" label="Text" initialHtml={html} onChange={setPreview} minHeight="24rem" />
        <ACheck name="is_published" defaultChecked={published} label="Published on the site" />
      </AdminForm>
      <section aria-label="Live preview" className="border-rule bg-bg rounded-[3px] border">
        <p className="smallcaps text-muted border-rule border-b px-5 py-2 text-[0.74rem]">Live preview</p>
        <div className="px-6 py-8">
          <h2 className="font-display text-[2rem] leading-tight">{heading}</h2>
          <div
            className="prose-jhts font-reading mt-6 text-[1.02rem] leading-relaxed"
            // The editor's own serialised output; sanitised on the server when saved.
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </section>
    </div>
  );
}
