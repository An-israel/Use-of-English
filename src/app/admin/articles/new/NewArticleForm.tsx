"use client";

import { useRouter } from "next/navigation";
import { AdminForm, AField, ASelect } from "@/components/admin/AdminForm";
import { createArticle } from "../actions";

export function NewArticleForm({
  types,
  defaultType,
}: {
  types: { value: string; label: string }[];
  defaultType: string;
}) {
  const router = useRouter();
  return (
    <AdminForm
      action={createArticle}
      submitLabel="Create draft"
      guard={false}
      onSaved={(r) => r.id && router.push(`/admin/articles/${r.id}`)}
    >
      <ASelect label="Type" name="type" defaultValue={defaultType} options={types} />
      <AField label="Title" name="title" required minLength={3} maxLength={300} autoFocus />
    </AdminForm>
  );
}
