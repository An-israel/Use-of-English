"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { FEE_INTEGRITY_STATEMENT } from "@/content/journal";
import { formatNaira } from "@/lib/format";
import { startPayment, type PayState } from "@/lib/payments/actions";
import { DECLARATIONS, FILE_KINDS, MAX_FILE_BYTES, countWords, type UploadKind } from "@/lib/submission";
import { browserClient } from "@/lib/supabase/browser";
import { ARTICLE_TYPE_LABEL } from "@/lib/types";
import {
  registerUpload,
  requestUpload,
  saveAuthors,
  saveDeclarations,
  saveDetails,
  submitDraft,
  type AuthorInput,
  type DetailsInput,
} from "../actions";

export type WizardProps = {
  id: string;
  details: DetailsInput;
  authors: AuthorInput[];
  files: Partial<Record<UploadKind, { name: string; size: number }>>;
  declarations: string[];
  categories: { id: string; name: string }[];
  fees: { enabled: boolean; reviewKobo: number };
  supabaseReady: boolean;
};

const STEPS = ["Article details", "Authors", "Files", "Declarations", "Review and submit"];
const TYPES = ["research_article", "theoretical_paper", "critical_review", "book_review"] as const;

const input = (bad?: string) =>
  clsx(
    "mt-1.5 w-full rounded-sm border bg-surface px-3.5 py-3 text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-thread",
    bad ? "border-accent" : "border-rule focus:border-fg",
  );
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="text-accent mt-1.5 text-[0.85rem]">{msg}</p> : null);

export function Wizard(props: WizardProps) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(props.details);
  const [authors, setAuthors] = useState<AuthorInput[]>(props.authors);
  const [files, setFiles] = useState(props.files);
  const [declared, setDeclared] = useState<string[]>(props.declarations);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ status: "ok" | "error"; text: string } | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [awaitingFee, setAwaitingFee] = useState(false);
  const [pending, start] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();

  // Autosave the details a moment after typing stops (stored server-side).
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(async () => {
      const r = await saveDetails(props.id, details);
      if (r.ok) setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    }, 1200);
    return () => clearTimeout(t);
  }, [details, props.id]);

  const go = (n: number) => {
    setStep(n);
    setErrors({});
    setMessage(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const next = () =>
    start(async () => {
      if (step === 0) {
        const r = await saveDetails(props.id, details, true);
        if (!r.ok) return (setErrors(r.fieldErrors ?? {}), setMessage({ status: "error", text: r.message }));
      }
      if (step === 1) {
        const r = await saveAuthors(props.id, authors);
        if (!r.ok) return (setErrors(r.fieldErrors ?? {}), setMessage({ status: "error", text: r.message }));
      }
      if (step === 2 && (!files.manuscript || !files.title_page)) {
        return setMessage({
          status: "error",
          text: "Upload the anonymised manuscript and the title page to continue.",
        });
      }
      if (step === 3) {
        if (declared.length < DECLARATIONS.length)
          return setMessage({ status: "error", text: "Please confirm every declaration." });
        const r = await saveDeclarations(props.id, declared);
        if (!r.ok) return setMessage({ status: "error", text: r.message });
      }
      go(step + 1);
    });

  const submit = () =>
    start(async () => {
      const r = await submitDraft(props.id);
      if (!r.ok) return setMessage({ status: "error", text: r.message });
      if (r.status === "awaiting_review_fee") setAwaitingFee(true);
      else router.push(`/account/submissions/${props.id}?new=1`);
    });

  const words = countWords(details.abstract);

  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-10">
      <nav aria-label="Submission steps" className="col-span-12 lg:col-span-3">
        <ol className="flex gap-2 overflow-x-auto lg:sticky lg:top-24 lg:flex-col lg:gap-0">
          {STEPS.map((label, i) => {
            const done = awaitingFee || i < step;
            const current = !awaitingFee && i === step;
            return (
              <li key={label} className="shrink-0">
                <button
                  type="button"
                  disabled={awaitingFee || i > step || pending}
                  onClick={() => go(i)}
                  aria-current={current ? "step" : undefined}
                  className={clsx(
                    "flex w-full items-center gap-3 border-l-2 py-2.5 pr-3 pl-4 text-left text-[0.92rem] transition-colors",
                    current ? "border-thread text-fg" : done ? "border-brand text-fg" : "border-rule text-muted",
                  )}
                >
                  <span className="tabular font-display text-[0.95rem]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="whitespace-nowrap">{label}</span>
                  {done && <span className="sr-only">(done)</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-muted mt-6 hidden text-[0.82rem] lg:block" aria-live="polite">
          {savedAt ? `Draft saved at ${savedAt}` : "Your draft is saved as you go."}
        </p>
      </nav>

      <div className="col-span-12 lg:col-span-8 lg:col-start-5">
        {awaitingFee ? (
          <PayStep id={props.id} reviewKobo={props.fees.reviewKobo} />
        ) : (
          <section aria-labelledby="step-title">
            <p className="smallcaps text-muted text-[0.82rem]">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 id="step-title" ref={headingRef} tabIndex={-1} className="font-display mt-2 text-[2rem] outline-none">
              {STEPS[step]}
            </h2>

            <div className="mt-8 space-y-7">
              {step === 0 && (
                <>
                  <label className="block">
                    <span>Title</span>
                    <input
                      className={input(errors.title)}
                      value={details.title}
                      onChange={(e) => setDetails({ ...details, title: e.target.value })}
                      maxLength={300}
                    />
                    <Err msg={errors.title} />
                  </label>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block">
                      <span>Article type</span>
                      <select
                        className={input(errors.type)}
                        value={details.type}
                        onChange={(e) => setDetails({ ...details, type: e.target.value })}
                      >
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {ARTICLE_TYPE_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span>Subject area</span>
                      <select
                        className={input(errors.categoryId)}
                        value={details.categoryId}
                        onChange={(e) => setDetails({ ...details, categoryId: e.target.value })}
                      >
                        <option value="">Choose a subject</option>
                        {props.categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <Err msg={errors.categoryId} />
                    </label>
                  </div>
                  <label className="block">
                    <span className="flex justify-between">
                      <span>Abstract</span>
                      <span
                        className={clsx(
                          "tabular text-[0.85rem]",
                          words && (words < 150 || words > 250) ? "text-accent" : "text-muted",
                        )}
                        aria-live="polite"
                      >
                        {words} / 150–250 words
                      </span>
                    </span>
                    <textarea
                      rows={9}
                      className={clsx(input(errors.abstract), "font-reading leading-relaxed")}
                      value={details.abstract}
                      onChange={(e) => setDetails({ ...details, abstract: e.target.value })}
                    />
                    <Err msg={errors.abstract} />
                  </label>
                  <KeywordInput
                    value={details.keywords}
                    onChange={(keywords) => setDetails({ ...details, keywords })}
                    error={errors.keywords}
                  />
                  <fieldset>
                    <legend>Citation style</legend>
                    <div className="mt-2 flex flex-wrap gap-6">
                      {[
                        ["apa7", "APA 7th edition"],
                        ["mla9", "MLA 9th edition"],
                      ].map(([v, l]) => (
                        <label key={v} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="citationStyle"
                            value={v}
                            checked={details.citationStyle === v}
                            onChange={() => setDetails({ ...details, citationStyle: v })}
                            className="size-4 accent-[var(--brand)]"
                          />
                          {l}
                        </label>
                      ))}
                    </div>
                    <Err msg={errors.citationStyle} />
                  </fieldset>
                </>
              )}

              {step === 1 && <AuthorsEditor authors={authors} onChange={setAuthors} errors={errors} />}

              {step === 2 && (
                <div className="space-y-6">
                  {(["manuscript", "title_page", "cover_letter"] as const).map((k) => (
                    <FileSlot
                      key={k}
                      id={props.id}
                      kind={k}
                      current={files[k]}
                      disabled={!props.supabaseReady}
                      onUploaded={(f) => setFiles((prev) => ({ ...prev, [k]: f }))}
                    />
                  ))}
                  <p className="text-muted text-[0.88rem]">
                    Files go straight to secure storage. Only you, the editors and (for the anonymised manuscript) your
                    reviewers can open them.
                  </p>
                </div>
              )}

              {step === 3 && (
                <fieldset className="space-y-4">
                  <legend className="sr-only">Declarations</legend>
                  {DECLARATIONS.map(([k, label]) => (
                    <label key={k} className="border-rule bg-surface flex items-start gap-3 rounded-sm border p-4">
                      <input
                        type="checkbox"
                        checked={declared.includes(k)}
                        onChange={(e) =>
                          setDeclared(e.target.checked ? [...declared, k] : declared.filter((d) => d !== k))
                        }
                        className="mt-1 size-4 shrink-0 accent-[var(--brand)]"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              {step === 4 && (
                <Review
                  details={details}
                  authors={authors}
                  files={files}
                  categories={props.categories}
                  fees={props.fees}
                />
              )}
            </div>

            <div className="mt-8">
              <FormMessage status={message?.status ?? "idle"} message={message?.text} />
            </div>

            <div className="border-rule mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => go(step - 1)}
                  disabled={pending}
                  className="text-muted decoration-rule hover:text-fg text-[0.95rem] underline underline-offset-4"
                >
                  ← Back
                </button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={pending}
                  className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3.5 font-medium disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save and continue"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="bg-brand text-brand-fg hover:bg-brand-hover rounded-sm px-6 py-3.5 font-medium disabled:opacity-60"
                >
                  {pending ? "Submitting…" : "Submit manuscript"}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function KeywordInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const add = () => {
    const parts = draft
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...new Set([...value, ...parts])].slice(0, 6));
    setDraft("");
  };
  return (
    <div>
      <label htmlFor={id} className="flex justify-between">
        <span>Keywords</span>
        <span className="tabular text-muted text-[0.85rem]">{value.length} / 3–6</span>
      </label>
      <div className={clsx(input(error), "flex flex-wrap items-center gap-2 py-2")}>
        {value.map((k) => (
          <span
            key={k}
            className="border-rule bg-bg inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-1 text-[0.88rem]"
          >
            {k}
            <button
              type="button"
              aria-label={`Remove ${k}`}
              onClick={() => onChange(value.filter((x) => x !== k))}
              className="text-muted hover:text-accent"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          disabled={value.length >= 6}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
            if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={add}
          placeholder={value.length ? "" : "Type a keyword and press Enter"}
          className="min-w-[10rem] flex-1 bg-transparent py-1 outline-none"
        />
      </div>
      <Err msg={error} />
    </div>
  );
}

function AuthorsEditor({
  authors,
  onChange,
  errors,
}: {
  authors: AuthorInput[];
  onChange: (a: AuthorInput[]) => void;
  errors: Record<string, string>;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  const update = (i: number, patch: Partial<AuthorInput>) =>
    onChange(authors.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= authors.length) return;
    const next = [...authors];
    const [a] = next.splice(from, 1);
    next.splice(to, 0, a);
    onChange(next);
  };
  return (
    <div className="space-y-4">
      <p className="text-muted">
        List the authors in the order they should appear. Drag to reorder, or use the arrows.
      </p>
      <ol className="space-y-4">
        {authors.map((a, i) => (
          <li
            key={i}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null) move(dragging, i);
              setDragging(null);
            }}
            className={clsx(
              "bg-surface rounded-[3px] border p-5",
              dragging === i ? "border-thread opacity-60" : "border-rule",
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className="text-muted cursor-grab select-none" title="Drag to reorder">
                  ⋮⋮
                </span>
                <span className="font-display text-[1.1rem]">Author {i + 1}</span>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move author ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                  className="rounded-sm px-2 py-1 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move author ${i + 1} down`}
                  disabled={i === authors.length - 1}
                  onClick={() => move(i, i + 1)}
                  className="rounded-sm px-2 py-1 disabled:opacity-30"
                >
                  ↓
                </button>
                {authors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onChange(authors.filter((_, j) => j !== i))}
                    className="text-muted decoration-rule hover:text-accent ml-2 text-[0.85rem] underline underline-offset-4"
                  >
                    Remove
                  </button>
                )}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[0.92rem]">
                Full name
                <input
                  className={input(errors[`${i}.name`])}
                  value={a.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                />
                <Err msg={errors[`${i}.name`]} />
              </label>
              <label className="block text-[0.92rem]">
                Email
                <input
                  type="email"
                  className={input(errors[`${i}.email`])}
                  value={a.email}
                  onChange={(e) => update(i, { email: e.target.value })}
                />
                <Err msg={errors[`${i}.email`]} />
              </label>
              <label className="block text-[0.92rem]">
                Affiliation
                <input
                  className={input()}
                  value={a.affiliation}
                  onChange={(e) => update(i, { affiliation: e.target.value })}
                />
              </label>
              <label className="block text-[0.92rem]">
                ORCID iD (optional)
                <input
                  className={input(errors[`${i}.orcid`])}
                  value={a.orcid}
                  placeholder="0000-0002-1825-0097"
                  onChange={(e) => update(i, { orcid: e.target.value })}
                />
                <Err msg={errors[`${i}.orcid`]} />
              </label>
            </div>
            <label className="mt-4 flex items-center gap-2 text-[0.92rem]">
              <input
                type="radio"
                name="corresponding"
                checked={a.isCorresponding}
                onChange={() => onChange(authors.map((x, j) => ({ ...x, isCorresponding: j === i })))}
                className="size-4 accent-[var(--brand)]"
              />
              Corresponding author
            </label>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() =>
          onChange([...authors, { name: "", affiliation: "", email: "", orcid: "", isCorresponding: false }])
        }
        disabled={authors.length >= 20}
        className="border-fg/70 hover:bg-fg hover:text-bg rounded-sm border px-5 py-2.5 font-medium"
      >
        Add a co-author
      </button>
    </div>
  );
}

function FileSlot({
  id,
  kind,
  current,
  disabled,
  onUploaded,
}: {
  id: string;
  kind: UploadKind;
  current?: { name: string; size: number };
  disabled: boolean;
  onUploaded: (f: { name: string; size: number }) => void;
}) {
  const spec = FILE_KINDS[kind];
  const [state, setState] = useState<{ phase: "idle" | "uploading" | "error"; message?: string }>({ phase: "idle" });
  const inputId = useId();

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!(spec.types as readonly string[]).includes(file.type)) return setState({ phase: "error", message: spec.hint });
    if (file.size > MAX_FILE_BYTES) return setState({ phase: "error", message: "Files must be smaller than 20 MB." });
    setState({ phase: "uploading" });
    const ticket = await requestUpload(id, kind, { name: file.name, size: file.size, type: file.type });
    if (!ticket.ok) return setState({ phase: "error", message: ticket.message });
    const { error } = await browserClient()
      .storage.from("submissions")
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
    if (error) return setState({ phase: "error", message: "The upload was interrupted. Please try again." });
    const done = await registerUpload(id, kind, ticket.path, file.name);
    if (!done.ok) return setState({ phase: "error", message: done.message });
    setState({ phase: "idle" });
    onUploaded({ name: file.name, size: file.size });
  };

  return (
    <div
      className={clsx(
        "rounded-[3px] border p-5",
        state.phase === "error" ? "border-accent" : "border-rule",
        "bg-surface",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display text-[1.15rem]">
            {spec.label}
            {spec.required ? "" : <span className="text-muted ml-2 font-sans text-[0.82rem]">optional</span>}
          </p>
          <p className="text-muted mt-1 text-[0.88rem]">{spec.hint}</p>
          {current && (
            <p className="mt-3 flex items-center gap-2 text-[0.9rem]">
              <span aria-hidden="true" className="bg-brand inline-block size-1.5 rotate-45" />
              {current.name} <span className="tabular text-muted">({(current.size / 1024 / 1024).toFixed(1)} MB)</span>
            </p>
          )}
        </div>
        <div>
          <input
            id={inputId}
            type="file"
            className="sr-only"
            accept={spec.types.join(",")}
            disabled={disabled || state.phase === "uploading"}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <label
            htmlFor={inputId}
            className={clsx(
              "inline-block cursor-pointer rounded-sm border px-4 py-2.5 text-[0.92rem]",
              disabled ? "cursor-not-allowed opacity-50" : "border-fg/70 hover:bg-fg hover:text-bg",
            )}
          >
            {state.phase === "uploading" ? "Uploading…" : current ? "Replace file" : "Choose file"}
          </label>
        </div>
      </div>
      <p aria-live="polite" className="text-accent mt-2 text-[0.85rem]">
        {state.phase === "error" ? state.message : ""}
      </p>
    </div>
  );
}

function Review({
  details,
  authors,
  files,
  categories,
  fees,
}: {
  details: DetailsInput;
  authors: AuthorInput[];
  files: WizardProps["files"];
  categories: WizardProps["categories"];
  fees: WizardProps["fees"];
}) {
  const row = "grid grid-cols-[9rem_1fr] gap-4 border-b border-rule py-3 text-[0.95rem]";
  return (
    <div className="space-y-8">
      <dl>
        <div className={row}>
          <dt className="text-muted">Title</dt>
          <dd className="font-display text-[1.15rem]">{details.title}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted">Type</dt>
          <dd>{ARTICLE_TYPE_LABEL[details.type as keyof typeof ARTICLE_TYPE_LABEL]}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted">Subject</dt>
          <dd>{categories.find((c) => c.id === details.categoryId)?.name}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted">Keywords</dt>
          <dd>{details.keywords.join(", ")}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted">Authors</dt>
          <dd>{authors.map((a) => `${a.name}${a.isCorresponding ? " (corresponding)" : ""}`).join(", ")}</dd>
        </div>
        <div className={row}>
          <dt className="text-muted">Files</dt>
          <dd>
            {(["manuscript", "title_page", "cover_letter"] as const)
              .filter((k) => files[k])
              .map((k) => FILE_KINDS[k].label)
              .join(", ")}
          </dd>
        </div>
      </dl>
      {fees.enabled && (
        <div className="border-rule bg-surface rounded-[3px] border p-6">
          <p className="font-display text-[1.2rem]">Review and plagiarism-check fee: {formatNaira(fees.reviewKobo)}</p>
          <p className="text-muted mt-2">
            After you submit, you will pay this fee securely with Paystack. Your manuscript goes to the editors once
            payment is confirmed.
          </p>
          <p className="mt-3 italic">{FEE_INTEGRITY_STATEMENT}</p>
        </div>
      )}
    </div>
  );
}

function PayStep({ id, reviewKobo }: { id: string; reviewKobo: number }) {
  const [state, action] = useActionState<PayState, FormData>(startPayment, { status: "idle" });
  return (
    <section aria-labelledby="pay-title">
      <p className="smallcaps text-muted text-[0.82rem]">Submitted · one step left</p>
      <h2 id="pay-title" className="font-display mt-2 text-[2rem]">
        Pay the review fee
      </h2>
      <p className="text-muted mt-4 max-w-[34rem]">
        Your manuscript is saved and has a submission ID. It goes to the editors as soon as the review and
        plagiarism-check fee is paid. You can also pay later from your account.
      </p>
      <div className="border-rule bg-surface mt-8 rounded-[3px] border p-6">
        <p className="tabular font-display text-[2rem]">{formatNaira(reviewKobo)}</p>
        <p className="text-muted mt-1">
          Card, bank transfer or USSD, through Paystack. JHTS never sees your card details.
        </p>
        <p className="mt-4 italic">{FEE_INTEGRITY_STATEMENT}</p>
        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="submissionId" value={id} />
          <input type="hidden" name="fee" value="review" />
          <FormMessage status={state.status} message={state.message} />
          <SubmitButton pendingLabel="Opening Paystack…">Pay {formatNaira(reviewKobo)} with Paystack</SubmitButton>
        </form>
      </div>
    </section>
  );
}
