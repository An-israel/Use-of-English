"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/forms/Field";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { register, type FormState } from "@/lib/auth-actions";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(register, { status: "idle" });
  if (state.status === "ok") {
    return (
      <div className="border-rule bg-surface rounded-[3px] border p-7" role="status">
        <span aria-hidden="true" className="bg-brand inline-block size-3 rotate-45" />
        <p className="font-display mt-4 text-[1.5rem]">Check your email</p>
        <p className="text-muted mt-2">{state.message}</p>
        <p className="text-muted mt-4 text-[0.9rem]">
          The link expires in one hour. If it doesn’t arrive, check your spam folder.
        </p>
      </div>
    );
  }
  const v = state.values ?? {};
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field
        label="Full name"
        name="fullName"
        autoComplete="name"
        required
        defaultValue={v.fullName}
        error={e.fullName}
        hint="As it should appear on your articles."
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={v.email}
        error={e.email}
      />
      <Field
        label="Affiliation (optional)"
        name="affiliation"
        autoComplete="organization"
        defaultValue={v.affiliation}
        error={e.affiliation}
        hint="Department and institution"
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={e.password}
        hint="At least 10 characters, mixing letters with numbers or symbols."
      />
      <label className="flex items-start gap-3 text-[0.92rem]">
        <input
          type="checkbox"
          name="terms"
          className="mt-1 size-4 accent-[var(--brand)]"
          aria-invalid={e.terms ? true : undefined}
        />
        <span>
          I agree to the{" "}
          <Link href="/policies/privacy" className="text-brand decoration-thread underline underline-offset-4">
            privacy policy
          </Link>
          .{e.terms && <span className="text-accent mt-1 block text-[0.85rem]">{e.terms}</span>}
        </span>
      </label>
      <FormMessage status={state.status} message={state.message} />
      <SubmitButton pendingLabel="Creating account…" className="w-full">
        Create account
      </SubmitButton>
      <p className="pt-2 text-[0.95rem]">
        Already registered?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-brand decoration-thread underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
