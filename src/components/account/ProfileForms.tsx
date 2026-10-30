"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/Field";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/auth-actions";
import { changeEmail, updateProfile } from "@/app/(site)/account/actions";

export function ProfileForm({ defaults }: { defaults: { fullName: string; affiliation: string; orcid: string } }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, { status: "idle" });
  const v = state.values ?? defaults;
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field label="Full name" name="fullName" autoComplete="name" defaultValue={v.fullName} error={e.fullName} />
      <Field
        label="Affiliation"
        name="affiliation"
        autoComplete="organization"
        defaultValue={v.affiliation}
        error={e.affiliation}
      />
      <Field
        label="ORCID iD"
        name="orcid"
        defaultValue={v.orcid}
        error={e.orcid}
        placeholder="0000-0002-1825-0097"
        hint="Optional. Shown with your name on published articles."
      />
      <FormMessage status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, action] = useActionState<FormState, FormData>(changeEmail, { status: "idle" });
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email ?? current}
        error={state.fieldErrors?.email}
      />
      <FormMessage status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Sending…">Change email</SubmitButton>
    </form>
  );
}
