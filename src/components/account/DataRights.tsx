"use client";

import { useActionState, useState } from "react";
import { Field } from "@/components/forms/Field";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import type { FormState } from "@/lib/auth-actions";
import { deleteAccount } from "@/app/(site)/account/actions";

/** Download a copy of your data, or delete your account (I4, NDPA 2023). */
export function DataRights({ isStaff }: { isStaff: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(deleteAccount, { status: "idle" });
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-10">
      <div>
        <h3 className="font-display text-[1.2rem]">Download your data</h3>
        <p className="text-muted mt-2 text-[0.92rem]">
          A file (JSON) with your profile, submissions, file names, history, payments and reviews.
        </p>
        <a
          href="/api/account/export"
          className="border-fg/70 hover:bg-fg hover:text-bg mt-4 inline-block rounded-sm border px-4 py-2.5 text-[0.92rem]"
        >
          Download my data
        </a>
      </div>
      <div>
        <h3 className="font-display text-[1.2rem]">Delete your account</h3>
        {isStaff ? (
          <p className="text-muted mt-2 text-[0.92rem]">
            Staff accounts are closed by a Super Admin. Please ask one to deactivate your account.
          </p>
        ) : (
          <>
            <p className="text-muted mt-2 text-[0.92rem]">
              Drafts are deleted with their files. Manuscripts you have submitted, reviews and payments must be kept for
              the scholarly and financial record: if you have any, your name and contact details are removed from them
              and you can no longer sign in. This cannot be undone.
            </p>
            {!open ? (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="decoration-rule hover:decoration-accent mt-4 text-[0.95rem] text-[var(--accent-text)] underline underline-offset-4"
              >
                I want to delete my account
              </button>
            ) : (
              <form action={action} className="border-accent/60 mt-5 space-y-5 rounded-[3px] border p-5" noValidate>
                <Field
                  label="Type DELETE to confirm"
                  name="confirm"
                  autoComplete="off"
                  error={state.fieldErrors?.confirm}
                />
                <FormMessage status={state.status} message={state.message} />
                <div className="flex flex-wrap items-center gap-4">
                  <SubmitButton pendingLabel="Deleting…">Delete my account</SubmitButton>
                  <button type="button" onClick={() => setOpen(false)} className="text-muted text-[0.95rem]">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
