"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/forms/Field";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { requestPasswordReset, type FormState } from "@/lib/auth-actions";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, { status: "idle" });
  if (state.status === "ok") return <FormMessage status="ok" message={state.message} />;
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <FormMessage status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
      <p className="pt-2 text-[0.95rem]">
        <Link href="/login" className="text-brand decoration-thread underline underline-offset-4">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
