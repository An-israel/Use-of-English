import Link from "next/link";
import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  ContactReceived,
  OpsAlert,
  PaymentReceipt,
  ReconciliationFlags,
  ReviewInvitation,
  ReviewReminder,
  ReviewSubmitted,
  StatusChanged,
  SubmissionReceived,
} from "@/emails/templates";
import { requireRole } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { STAFF_ROLES } from "@/lib/workflow";

export const metadata = { title: "Email previews" };

/**
 * Every email the site sends, rendered with made-up example details (I6), so
 * editors can see exactly what authors, reviewers and staff receive.
 */
const u = (path: string) => `${siteUrl}${path}`;
const PREVIEWS: { id: string; label: string; to: string; when: string; element: ReactElement }[] = [
  {
    id: "received",
    label: "Submission received",
    to: "Author",
    when: "An author submits a manuscript.",
    element: (
      <SubmissionReceived
        name="Ada Okafor"
        publicId="JHTS-2027-0042"
        title="Proverbs in Translation (example)"
        url={u("/account")}
        feeDue="₦10,000 review fee"
      />
    ),
  },
  {
    id: "receipt",
    label: "Payment receipt",
    to: "Author",
    when: "Paystack confirms a fee payment.",
    element: (
      <PaymentReceipt
        name="Ada Okafor"
        receiptNumber="JHTS-R-2027-0007"
        feeLabel="Review fee"
        amount="₦10,000.00"
        reference="JHTS-EXAMPLE-REF"
        publicId="JHTS-2027-0042"
        paidAt="15 January 2027"
        url={u("/account")}
      />
    ),
  },
  {
    id: "status",
    label: "Decision or status change",
    to: "Author",
    when: "An editor moves a submission on (screening, review, decision).",
    element: (
      <StatusChanged
        name="Ada Okafor"
        publicId="JHTS-2027-0042"
        title="Proverbs in Translation (example)"
        status="Minor revisions"
        nextStep="Upload your revised manuscript from your dashboard within three weeks."
        message="Thank you for your submission. The reviewers ask for a few small changes, listed below."
        url={u("/account")}
      />
    ),
  },
  {
    id: "invitation",
    label: "Invitation to review",
    to: "Reviewer",
    when: "An editor invites a reviewer.",
    element: (
      <ReviewInvitation
        name="Dr Chidi Eze"
        title="Proverbs in Translation (example)"
        abstract="An example abstract: the study compares how Igbo proverbs are rendered in three English translations."
        due="12 February 2027"
        url={u("/review")}
      />
    ),
  },
  {
    id: "reminder",
    label: "Review reminder",
    to: "Reviewer",
    when: "A review is due within three days, or overdue.",
    element: (
      <ReviewReminder
        name="Dr Chidi Eze"
        title="Proverbs in Translation (example)"
        due="12 February 2027"
        overdue={false}
        url={u("/review")}
      />
    ),
  },
  {
    id: "review-submitted",
    label: "Review submitted",
    to: "Editors",
    when: "A reviewer sends their report.",
    element: (
      <ReviewSubmitted
        publicId="JHTS-2027-0042"
        title="Proverbs in Translation (example)"
        reviewer="Reviewer 1"
        recommendation="Minor revisions"
        url={u("/admin/submissions")}
      />
    ),
  },
  {
    id: "contact",
    label: "Contact form message",
    to: "Editorial office",
    when: "A visitor writes through the Contact page.",
    element: (
      <ContactReceived
        fromName="Ada Okafor"
        fromEmail="ada@example.com"
        subject="Question about the deadline"
        message="Is the deadline for the inaugural issue the same for book reviews?"
        url={u("/admin/messages")}
      />
    ),
  },
  {
    id: "reconciliation",
    label: "Reconciliation flags",
    to: "Super Admin",
    when: "The daily check finds payments that don’t match Paystack.",
    element: <ReconciliationFlags date="15 January 2027" flags={2} url={u("/admin/reconciliation")} />,
  },
  {
    id: "alert",
    label: "Operations alert",
    to: "Super Admin",
    when: "Backups, jobs or the certificate need attention.",
    element: (
      <OpsAlert
        subject="Background jobs are failing"
        lines={["3 jobs moved to the failed list in the last day."]}
        url={u("/admin/system")}
      />
    ),
  },
];

export default async function EmailPreviewsPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await requireRole(STAFF_ROLES, "/admin/emails");
  const { t } = await searchParams;
  const current = PREVIEWS.find((p) => p.id === t) ?? PREVIEWS[0];
  const html = await render(current.element);
  return (
    <>
      <AdminPageHeader
        crumbs={[{ href: "/admin", label: "Admin" }]}
        title="Email previews"
        description="Every email the site sends, shown with example details. Names, numbers and dates here are made up."
      />
      <div className="grid grid-cols-1 gap-8 px-5 py-8 lg:grid-cols-12 lg:px-10">
        <nav aria-label="Emails" className="lg:col-span-4">
          <ul className="border-rule divide-rule divide-y rounded-[3px] border">
            {PREVIEWS.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/emails?t=${p.id}`}
                  aria-current={p.id === current.id ? "page" : undefined}
                  className="hover:bg-surface aria-[current=page]:bg-surface block px-4 py-3 aria-[current=page]:shadow-[inset_3px_0_0_var(--brand)]"
                >
                  <span className="block">{p.label}</span>
                  <span className="text-muted block text-[0.85rem]">
                    To: {p.to} · {p.when}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <section aria-label={`Preview: ${current.label}`} className="min-w-0 lg:col-span-8">
          <iframe
            title={`Preview of the “${current.label}” email`}
            srcDoc={html}
            sandbox=""
            className="border-rule h-[44rem] w-full rounded-[3px] border bg-white"
          />
        </section>
      </div>
    </>
  );
}
