import "server-only";
import {
  ContactReceived,
  PaymentReceipt,
  ReconciliationFlags,
  ReviewInvitation,
  ReviewReminder,
  ReviewSubmitted,
  StatusChanged,
  SubmissionReceived,
} from "@/emails/templates";
import { sendEmail } from "@/lib/email/send";
import { siteUrl } from "@/lib/env";
import { formatDate, formatNaira, formatNairaPlain } from "@/lib/format";
import { isPaymentTestMode } from "@/lib/payments/paystack";
import { renderReceipt } from "@/lib/pdf/documents";
import { RECOMMENDATION_LABEL, type Recommendation } from "@/lib/submission";
import { adminClient } from "@/lib/supabase/clients";
import { AUTHOR_NEXT_STEP, STATUS_LABEL, type SubmissionStatus } from "@/lib/workflow";
import { enqueue, PRIORITY } from "./queue";

export type Job = { id: number; kind: string; payload: Record<string, unknown>; attempts: number };

const FEE_LABEL = { review: "Review and plagiarism-check fee", publication: "Publication fee" } as const;

async function contactEmail(): Promise<string | null> {
  const { data } = await adminClient().from("site_settings").select("value").eq("key", "contactEmail").maybeSingle();
  const v = typeof data?.value === "string" ? data.value : null;
  return v && !v.startsWith("[") ? v : null;
}

/** Fan a domain event out into the work it implies (item 17). */
async function dispatchEvent(payload: Record<string, unknown>) {
  const db = adminClient();
  const { data: ev } = await db
    .from("domain_events")
    .select("id, type, aggregate_id, payload")
    .eq("id", payload.event_id)
    .maybeSingle();
  if (!ev) return;
  const id = ev.aggregate_id as string;
  switch (ev.type) {
    case "payment.succeeded":
      await enqueue("payment_receipt", { payment_id: id }, `receipt:${id}`, "default", PRIORITY.payment);
      break;
    case "submission.created":
      await enqueue("email_submission_received", { submission_id: id }, `received:${id}`);
      break;
    case "submission.status_changed": {
      const p = ev.payload as { from: SubmissionStatus; to: SubmissionStatus };
      // The "received" email already covers leaving draft.
      if (p.from !== "draft")
        await enqueue("email_status_changed", { submission_id: id, to: p.to, event_id: ev.id }, `status:${ev.id}`);
      break;
    }
    case "contact.received":
      await enqueue("email_contact", { message_id: id }, `contact:${id}`);
      break;
    case "review.assigned":
      await enqueue("email_review_invitation", { assignment_id: id }, `review-invite:${id}`);
      break;
    case "review.submitted":
      await enqueue("email_review_submitted", { assignment_id: id }, `review-done:${id}`);
      break;
    default:
      break; // cache revalidation and realtime arrive with later milestones
  }
}

async function paymentReceipt(payload: Record<string, unknown>) {
  const db = adminClient();
  // payments has two links to profiles (payer and waiver), so name the one we want.
  const { data: p, error } = await db
    .from("payments")
    .select(
      "id, reference, fee_type, amount_kobo, paid_at, channel, receipt_number, receipt_path, author_id, submission:submissions ( id, public_id, title ), author:profiles!payments_author_id_fkey ( full_name, email )",
    )
    .eq("id", payload.payment_id)
    .single();
  if (error) throw new Error(`receipt lookup failed: ${error.message}`);
  if (!p?.receipt_number) throw new Error("payment not ready for a receipt");
  const sub = p.submission as unknown as { id: string; public_id: string; title: string };
  const author = p.author as unknown as { full_name: string; email: string };

  let path = p.receipt_path as string | null;
  if (!path) {
    const pdf = await renderReceipt({
      receiptNumber: p.receipt_number,
      payer: author.full_name || author.email,
      payerEmail: author.email,
      feeLabel: FEE_LABEL[p.fee_type as "review" | "publication"],
      amount: formatNairaPlain(p.amount_kobo),
      date: formatDate(p.paid_at),
      reference: p.reference,
      channel: p.channel,
      publicId: sub.public_id,
      title: sub.title,
      testMode: isPaymentTestMode(),
    });
    path = `receipts/${p.author_id}/${p.receipt_number}.pdf`;
    const up = await db.storage.from("finance").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error(`receipt upload failed: ${up.error.message}`);
    await db.from("payments").update({ receipt_path: path }).eq("id", p.id);
  }

  await sendEmail({
    to: author.email,
    subject: `Receipt ${p.receipt_number} · JHTS`,
    template: "payment_receipt",
    relatedId: p.id,
    dedupeKey: `receipt-email:${p.id}`,
    element: (
      <PaymentReceipt
        name={author.full_name || "author"}
        receiptNumber={p.receipt_number}
        feeLabel={FEE_LABEL[p.fee_type as "review" | "publication"]}
        amount={formatNaira(p.amount_kobo)}
        reference={p.reference}
        publicId={sub.public_id}
        paidAt={formatDate(p.paid_at)}
        url={`${siteUrl}/account/submissions/${sub.id}`}
      />
    ),
  });
}

async function submissionEmail(payload: Record<string, unknown>, kind: "received" | "status") {
  const db = adminClient();
  const { data: s, error } = await db
    .from("submissions")
    .select("id, public_id, title, status, author:profiles!submissions_author_id_fkey ( full_name, email )")
    .eq("id", payload.submission_id)
    .single();
  // A failed lookup must fail the job (so it retries), never pass silently.
  if (error || !s) throw new Error(`submission lookup failed: ${error?.message ?? "not found"}`);
  const author = s.author as unknown as { full_name: string; email: string };
  const url = `${siteUrl}/account/submissions/${s.id}`;
  if (kind === "received") {
    const { data: fees } = await db.rpc("fees_enabled");
    const { data: setting } = await db.from("site_settings").select("value").eq("key", "fees").maybeSingle();
    const reviewKobo = (setting?.value as { reviewKobo?: number } | null)?.reviewKobo ?? 500_000;
    await sendEmail({
      to: author.email,
      subject: `Submission ${s.public_id} received · JHTS`,
      template: "submission_received",
      relatedId: s.id,
      dedupeKey: `received-email:${s.id}`,
      element: (
        <SubmissionReceived
          name={author.full_name || "author"}
          publicId={s.public_id}
          title={s.title}
          url={url}
          feeDue={fees && s.status === "awaiting_review_fee" ? formatNaira(reviewKobo) : null}
        />
      ),
    });
    return;
  }
  const to = payload.to as SubmissionStatus;
  const { data: msg } = await db
    .from("submission_events")
    .select("message")
    .eq("submission_id", s.id)
    .eq("visibility", "author")
    .not("message", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  await sendEmail({
    to: author.email,
    subject: `${s.public_id}: ${STATUS_LABEL[to]} · JHTS`,
    template: "status_changed",
    relatedId: s.id,
    dedupeKey: `status-email:${payload.event_id}`,
    element: (
      <StatusChanged
        name={author.full_name || "author"}
        publicId={s.public_id}
        title={s.title}
        status={STATUS_LABEL[to]}
        nextStep={AUTHOR_NEXT_STEP[to]}
        message={msg?.message ?? undefined}
        url={url}
      />
    ),
  });
}

async function contactNotification(payload: Record<string, unknown>) {
  const to = await contactEmail();
  if (!to) return; // the office address is still a placeholder
  const { data: m, error } = await adminClient()
    .from("contact_messages")
    .select("id, name, email, subject, message")
    .eq("id", payload.message_id)
    .single();
  if (error || !m) throw new Error(`contact lookup failed: ${error?.message ?? "not found"}`);
  await sendEmail({
    to,
    replyTo: m.email,
    subject: `Contact form: ${m.subject}`,
    template: "contact_received",
    relatedId: m.id,
    dedupeKey: `contact-email:${m.id}`,
    element: (
      <ContactReceived
        fromName={m.name}
        fromEmail={m.email}
        subject={m.subject}
        message={m.message}
        url={`${siteUrl}/admin/messages`}
      />
    ),
  });
}

async function reviewEmail(payload: Record<string, unknown>, kind: "invitation" | "submitted") {
  const db = adminClient();
  // review_assignments links to profiles twice (reviewer, invited_by): name the reviewer link.
  const { data: r, error } = await db
    .from("review_assignments")
    .select(
      "id, due_at, status, recommendation, reviewer:profiles!review_assignments_reviewer_id_fkey ( full_name, email ), submission:submissions ( id, public_id, title, abstract, handling_editor_id )",
    )
    .eq("id", payload.assignment_id)
    .single();
  if (error || !r) throw new Error(`review lookup failed: ${error?.message ?? "not found"}`);
  const reviewer = r.reviewer as unknown as { full_name: string; email: string };
  const sub = r.submission as unknown as {
    id: string;
    public_id: string;
    title: string;
    abstract: string;
    handling_editor_id: string | null;
  };
  if (kind === "invitation") {
    if (r.status === "cancelled") return;
    await sendEmail({
      to: reviewer.email,
      subject: "Invitation to review for JHTS",
      template: "review_invitation",
      relatedId: r.id,
      dedupeKey: `review-invite-email:${r.id}`,
      element: (
        <ReviewInvitation
          name={reviewer.full_name || "colleague"}
          title={sub.title}
          abstract={sub.abstract}
          due={formatDate(r.due_at)}
          url={`${siteUrl}/review/${r.id}`}
        />
      ),
    });
    return;
  }
  // The handling editor if one is set, otherwise the editorial office.
  let to: string | null = null;
  if (sub.handling_editor_id) {
    const { data: ed } = await db.from("profiles").select("email").eq("id", sub.handling_editor_id).maybeSingle();
    to = ed?.email ?? null;
  }
  to ??= await contactEmail();
  if (!to) return;
  await sendEmail({
    to,
    subject: `${sub.public_id}: review received`,
    template: "review_submitted",
    relatedId: r.id,
    dedupeKey: `review-done-email:${r.id}`,
    element: (
      <ReviewSubmitted
        publicId={sub.public_id}
        title={sub.title}
        reviewer={reviewer.full_name || reviewer.email}
        recommendation={r.recommendation ? RECOMMENDATION_LABEL[r.recommendation as Recommendation] : "—"}
        url={`${siteUrl}/admin/submissions/${sub.id}`}
      />
    ),
  });
}

/** Tell the Finance Officers and Super Admins that the daily comparison found mismatches. */
async function reconciliationEmail(payload: Record<string, unknown>) {
  const { data: staff, error } = await adminClient()
    .from("profiles")
    .select("email")
    .in("role", ["finance_officer", "super_admin"])
    .eq("is_active", true);
  if (error) throw new Error(`finance staff lookup failed: ${error.message}`);
  const date = String(payload.date);
  const flags = Number(payload.flags);
  for (const { email } of staff ?? []) {
    await sendEmail({
      to: email,
      subject: `Reconciliation ${date}: ${flags} payment${flags === 1 ? "" : "s"} to check`,
      template: "reconciliation_flags",
      dedupeKey: `reconcile:${date}:${flags}:${email}`,
      element: <ReconciliationFlags date={date} flags={flags} url={`${siteUrl}/admin/reconciliation`} />,
    });
  }
}

async function reviewReminder(payload: Record<string, unknown>) {
  const { data: r, error } = await adminClient()
    .from("review_assignments")
    .select(
      "id, status, due_at, reviewer:profiles!review_assignments_reviewer_id_fkey ( full_name, email ), submission:submissions ( title )",
    )
    .eq("id", payload.assignment_id)
    .single();
  if (error || !r) throw new Error(`review lookup failed: ${error?.message ?? "not found"}`);
  if (!["invited", "accepted"].includes(r.status)) return; // answered since the reminder was queued
  const reviewer = r.reviewer as unknown as { full_name: string; email: string };
  const sub = r.submission as unknown as { title: string };
  await sendEmail({
    to: reviewer.email,
    subject: Date.parse(r.due_at) < Date.now() ? "Your JHTS review is overdue" : "Reminder: your JHTS review",
    template: "review_reminder",
    relatedId: r.id,
    dedupeKey: `review-reminder:${r.id}:${new Date().toISOString().slice(0, 10)}`,
    element: (
      <ReviewReminder
        name={reviewer.full_name || "colleague"}
        title={sub.title}
        due={formatDate(r.due_at)}
        overdue={Date.parse(r.due_at) < Date.now()}
        url={`${siteUrl}/review/${r.id}`}
      />
    ),
  });
}

export const HANDLERS: Record<string, (payload: Record<string, unknown>) => Promise<void>> = {
  dispatch_event: dispatchEvent,
  payment_receipt: paymentReceipt,
  email_submission_received: (p) => submissionEmail(p, "received"),
  email_status_changed: (p) => submissionEmail(p, "status"),
  email_contact: contactNotification,
  email_review_invitation: (p) => reviewEmail(p, "invitation"),
  email_review_submitted: (p) => reviewEmail(p, "submitted"),
  email_reconciliation: reconciliationEmail,
  email_review_reminder: reviewReminder,
};
