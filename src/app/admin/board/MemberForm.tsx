"use client";

import { AdminForm, AField, ASelect } from "@/components/admin/AdminForm";
import { BOARD_GROUP_LABEL, BOARD_GROUP_ORDER } from "@/lib/types";
import { saveBoardMember } from "../journal-actions";

export type MemberValues = {
  id: string;
  version: number;
  group: string;
  name: string;
  title: string;
  affiliation: string;
  orcid: string;
  profile_url: string;
  term_start: string;
  term_end: string;
};

export function MemberForm({ values }: { values?: MemberValues }) {
  return (
    <AdminForm action={saveBoardMember} submitLabel={values ? "Save" : "Add member"} resetOnSave={!values}>
      <input type="hidden" name="id" value={values?.id ?? ""} />
      <input type="hidden" name="version" value={values?.version ?? 0} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="Name" name="name" defaultValue={values?.name} required />
        <AField label="Title" name="title" defaultValue={values?.title} placeholder="Prof., Dr." />
      </div>
      <ASelect
        label="Group"
        name="group"
        defaultValue={values?.group ?? "associate_editors"}
        options={BOARD_GROUP_ORDER.map((g) => ({ value: g, label: BOARD_GROUP_LABEL[g] }))}
      />
      <AField label="Affiliation" name="affiliation" defaultValue={values?.affiliation} />
      <div className="grid gap-3 sm:grid-cols-2">
        <AField label="ORCID iD" name="orcid" defaultValue={values?.orcid} placeholder="0000-0000-0000-0000" />
        <AField
          label="Profile link"
          name="profile_url"
          type="url"
          defaultValue={values?.profile_url}
          placeholder="https://"
        />
        <AField label="Term starts" name="term_start" type="date" defaultValue={values?.term_start} />
        <AField label="Term ends" name="term_end" type="date" defaultValue={values?.term_end} />
      </div>
    </AdminForm>
  );
}
