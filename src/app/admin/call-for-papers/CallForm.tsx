"use client";

import { ACheck, AdminForm, AField, ASelect } from "@/components/admin/AdminForm";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { saveCall } from "../journal-actions";

export type CallValues = {
  id: string;
  version: number;
  title: string;
  target_issue_id: string;
  target_label: string;
  summary_html: string;
  banner_text: string;
  deadline: string;
  review_period: string;
  publication_month: string;
  is_active: boolean;
};

export function CallForm({ values, issues }: { values?: CallValues; issues: { value: string; label: string }[] }) {
  return (
    <AdminForm action={saveCall} submitLabel={values ? "Save call" : "Create call"}>
      <input type="hidden" name="id" value={values?.id ?? ""} />
      <input type="hidden" name="version" value={values?.version ?? 0} />
      <AField
        label="Title"
        name="title"
        defaultValue={values?.title}
        required
        placeholder="Call for Papers: Vol. 1 No. 2"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ASelect
          label="For issue"
          name="target_issue_id"
          defaultValue={values?.target_issue_id ?? ""}
          options={[{ value: "", label: "Not created yet" }, ...issues]}
        />
        <AField
          label="Issue label"
          name="target_label"
          defaultValue={values?.target_label}
          required
          hint="Shown on the site, e.g. Vol. 1 No. 1 (March 2027)."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AField
          label="Submission deadline (Lagos time)"
          name="deadline"
          type="datetime-local"
          defaultValue={values?.deadline}
          required
        />
        <AField
          label="Review period"
          name="review_period"
          defaultValue={values?.review_period}
          placeholder="January 2027"
        />
        <AField
          label="Publication"
          name="publication_month"
          defaultValue={values?.publication_month}
          placeholder="March 2027"
        />
      </div>
      <AField
        label="Banner text"
        name="banner_text"
        defaultValue={values?.banner_text}
        maxLength={200}
        hint="One line in the site-wide banner while the call is active. The countdown is added automatically."
      />
      <RichTextEditor
        name="summary_html"
        label="The call"
        initialHtml={values?.summary_html ?? ""}
        placeholder="Themes, scope and how to submit…"
      />
      <ACheck
        name="is_active"
        defaultChecked={values?.is_active}
        label="Active: show this call on the site (switches off any other call)"
      />
    </AdminForm>
  );
}
