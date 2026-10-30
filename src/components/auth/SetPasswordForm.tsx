"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/Field";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { setPassword, type FormState } from "@/lib/auth-actions";

/** New password after a reset link, or first password plus profile after an invitation. */
export function SetPasswordForm({
  next,
  withProfile,
  defaults,
}: {
  next: string;
  withProfile?: boolean;
  defaults?: { fullName?: string; affiliation?: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(setPassword, { status: "idle" });
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {withProfile && (
        <>
          <Field
            label="Full name"
            name="fullName"
            autoComplete="name"
            required
            defaultValue={v.fullName ?? defaults?.fullName}
          />
          <Field
            label="Affiliation"
            name="affiliation"
            autoComplete="organization"
            defaultValue={v.affiliation ?? defaults?.affiliation}
          />
        </>
      )}
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={e.password}
        hint="At least 10 characters, mixing letters with numbers or symbols."
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={e.confirm}
      />
      <FormMessage status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Saving…" className="w-full">
        Save password
      </SubmitButton>
    </form>
  );
}
