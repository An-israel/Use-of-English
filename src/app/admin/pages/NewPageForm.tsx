"use client";

import { useRouter } from "next/navigation";
import { AdminForm, AField, ASelect } from "@/components/admin/AdminForm";
import { createPage } from "../journal-actions";

export function NewPageForm() {
  const router = useRouter();
  return (
    <AdminForm
      action={createPage}
      submitLabel="Create"
      guard={false}
      onSaved={(r) => r.id && router.push(`/admin/pages/${r.id}`)}
    >
      <ASelect
        label="Kind"
        name="kind"
        defaultValue="policy"
        options={[
          { value: "policy", label: "Policy (listed under Policies)" },
          { value: "page", label: "Page" },
        ]}
      />
      <AField label="Title" name="title" required />
    </AdminForm>
  );
}
