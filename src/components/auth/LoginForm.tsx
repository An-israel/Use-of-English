"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/forms/Field";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { resendConfirmation, signIn, signInWithGoogle, type FormState } from "@/lib/auth-actions";

export function LoginForm({ next, notice, google }: { next: string; notice?: string; google: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, { status: "idle" });
  const [resent, resend] = useActionState<FormState, FormData>(resendConfirmation, { status: "idle" });
  const v = state.values ?? {};
  return (
    <div className="space-y-8">
      {notice && <FormMessage status="error" message={notice} />}
      <form action={action} className="space-y-5" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={v.email}
          error={state.fieldErrors?.email}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          error={state.fieldErrors?.password}
          trailing={
            <Link
              href="/forgot-password"
              className="text-muted decoration-rule hover:text-fg text-[0.85rem] underline underline-offset-4"
            >
              Forgot password?
            </Link>
          }
        />
        <FormMessage status={state.status} message={state.message} />
        <SubmitButton pendingLabel="Signing in…" className="w-full">
          Sign in
        </SubmitButton>
      </form>
      {v.unconfirmed && (
        <form action={resend} className="text-[0.9rem]">
          <input type="hidden" name="email" value={v.email} />
          <button type="submit" className="text-brand decoration-thread underline underline-offset-4">
            Send the confirmation link again
          </button>
          <FormMessage status={resent.status} message={resent.message} />
        </form>
      )}
      {google && (
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <div className="text-muted mb-5 flex items-center gap-4 text-[0.82rem]">
            <span className="bg-rule h-px flex-1" /> or <span className="bg-rule h-px flex-1" />
          </div>
          <button
            type="submit"
            className="border-fg/70 hover:bg-fg hover:text-bg w-full rounded-sm border px-6 py-3.5 font-medium"
          >
            Continue with Google
          </button>
        </form>
      )}
      <p className="text-[0.95rem]">
        New to JHTS?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="text-brand decoration-thread underline underline-offset-4"
        >
          Create an author account
        </Link>
      </p>
    </div>
  );
}
