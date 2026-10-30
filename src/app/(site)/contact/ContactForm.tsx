"use client";

import Script from "next/script";
import { useActionState } from "react";
import clsx from "clsx";
import { sendContactMessage, type ContactState } from "./actions";

const SUBJECTS = ["A submission", "Peer review", "Fees and payments", "Book reviews", "Something else"];

export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div role="status" className="border-rule bg-surface rounded-[3px] border p-8">
        <span aria-hidden="true" className="bg-brand inline-block size-3 rotate-45" />
        <p className="font-display mt-4 text-[1.6rem]">Message sent</p>
        <p className="text-muted mt-2">{state.message ?? "Thank you."}</p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const input = (bad?: string) =>
    clsx(
      "mt-1.5 w-full rounded-sm border bg-surface px-3.5 py-3 text-fg",
      bad ? "border-accent" : "border-rule focus:border-fg",
    );

  return (
    <form action={action} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-[0.92rem]">Your name</span>
          <input
            name="name"
            autoComplete="name"
            required
            defaultValue={v.name}
            aria-invalid={!!err.name}
            aria-describedby={err.name ? "e-name" : undefined}
            className={input(err.name)}
          />
          {err.name && (
            <span id="e-name" className="text-accent mt-1.5 block text-[0.85rem]">
              {err.name}
            </span>
          )}
        </label>
        <label className="block">
          <span className="text-[0.92rem]">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={v.email}
            aria-invalid={!!err.email}
            aria-describedby={err.email ? "e-email" : undefined}
            className={input(err.email)}
          />
          {err.email && (
            <span id="e-email" className="text-accent mt-1.5 block text-[0.85rem]">
              {err.email}
            </span>
          )}
        </label>
      </div>
      <label className="block">
        <span className="text-[0.92rem]">Subject</span>
        <input
          name="subject"
          list="contact-subjects"
          required
          defaultValue={v.subject}
          aria-invalid={!!err.subject}
          aria-describedby={err.subject ? "e-subject" : undefined}
          className={input(err.subject)}
        />
        <datalist id="contact-subjects">
          {SUBJECTS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {err.subject && (
          <span id="e-subject" className="text-accent mt-1.5 block text-[0.85rem]">
            {err.subject}
          </span>
        )}
      </label>
      <label className="block">
        <span className="text-[0.92rem]">Message</span>
        <textarea
          name="message"
          rows={7}
          required
          defaultValue={v.message}
          aria-invalid={!!err.message}
          aria-describedby={err.message ? "e-message" : undefined}
          className={input(err.message)}
        />
        {err.message && (
          <span id="e-message" className="text-accent mt-1.5 block text-[0.85rem]">
            {err.message}
          </span>
        )}
      </label>
      {/* honeypot */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {turnstileSiteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="auto" />
        </>
      )}
      <div aria-live="polite" role="status" className="text-accent min-h-6 text-[0.92rem]">
        {state.status === "error" && state.message}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3.5 font-medium disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
