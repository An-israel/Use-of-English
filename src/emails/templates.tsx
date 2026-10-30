import { Button, Facts, Layout, P } from "./Layout";

export function SubmissionReceived({
  name,
  publicId,
  title,
  url,
  feeDue,
}: {
  name: string;
  publicId: string;
  title: string;
  url: string;
  feeDue: string | null;
}) {
  return (
    <Layout preview={`We have received ${publicId}`} title="Your submission has been received">
      <P>Dear {name},</P>
      <P>Thank you for submitting your manuscript to the Journal of Humanities and Transcultural Studies.</P>
      <Facts
        rows={[
          ["Submission ID", publicId],
          ["Title", title],
        ]}
      />
      {feeDue ? (
        <P>Your manuscript will go to the editors as soon as the review fee of {feeDue} is paid.</P>
      ) : (
        <P>Your manuscript is now with the editors for screening. We will email you whenever its status changes.</P>
      )}
      <Button href={url}>View your submission</Button>
    </Layout>
  );
}

export function PaymentReceipt({
  name,
  receiptNumber,
  feeLabel,
  amount,
  reference,
  publicId,
  paidAt,
  url,
}: {
  name: string;
  receiptNumber: string;
  feeLabel: string;
  amount: string;
  reference: string;
  publicId: string;
  paidAt: string;
  url: string;
}) {
  return (
    <Layout preview={`Receipt ${receiptNumber} for ${amount}`} title="Payment received">
      <P>Dear {name},</P>
      <P>Thank you. We have received your payment.</P>
      <Facts
        rows={[
          ["Receipt number", receiptNumber],
          ["Fee", feeLabel],
          ["Amount", amount],
          ["Date", paidAt],
          ["Paystack reference", reference],
          ["Submission ID", publicId],
        ]}
      />
      <P>A PDF receipt is available from your submission page at any time.</P>
      <Button href={url}>Download your receipt</Button>
    </Layout>
  );
}

export function StatusChanged({
  name,
  publicId,
  title,
  status,
  nextStep,
  message,
  url,
}: {
  name: string;
  publicId: string;
  title: string;
  status: string;
  nextStep?: string;
  message?: string;
  url: string;
}) {
  return (
    <Layout preview={`${publicId}: ${status}`} title="Your submission has been updated">
      <P>Dear {name},</P>
      <P>
        The status of your submission <strong>{publicId}</strong>, “{title}”, is now <strong>{status}</strong>.
      </P>
      {message && (
        <blockquote
          style={{
            borderLeft: "2px solid #C8962E",
            margin: "16px 0",
            padding: "4px 0 4px 16px",
            fontStyle: "italic",
            color: "#3a352d",
          }}
        >
          {message}
        </blockquote>
      )}
      {nextStep && <P>{nextStep}</P>}
      <Button href={url}>View your submission</Button>
    </Layout>
  );
}

export function ContactReceived({
  fromName,
  fromEmail,
  subject,
  message,
  url,
}: {
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
  url: string;
}) {
  return (
    <Layout preview={`Contact form: ${subject}`} title="New message from the contact form">
      <Facts
        rows={[
          ["From", `${fromName} <${fromEmail}>`],
          ["Subject", subject],
        ]}
      />
      <P>{message}</P>
      <Button href={url}>Open the inbox</Button>
    </Layout>
  );
}

export function ReviewInvitation({
  name,
  title,
  abstract,
  due,
  url,
}: {
  name: string;
  title: string;
  abstract: string;
  due: string;
  url: string;
}) {
  return (
    <Layout preview={`Invitation to review: ${title}`} title="Will you review a manuscript for JHTS?">
      <P>Dear {name},</P>
      <P>
        The editors of the Journal of Humanities and Transcultural Studies invite you to review the manuscript “{title}
        ”. Review is double-blind: the authors’ names are withheld.
      </P>
      <blockquote
        style={{
          borderLeft: "2px solid #C8962E",
          margin: "16px 0",
          padding: "4px 0 4px 16px",
          color: "#3a352d",
        }}
      >
        {abstract.length > 900 ? `${abstract.slice(0, 900)}…` : abstract}
      </blockquote>
      <Facts rows={[["Review due", due]]} />
      <P>Please accept or decline on the review page. If you have a conflict of interest, decline and tell us why.</P>
      <Button href={url}>Respond to the invitation</Button>
    </Layout>
  );
}

export function ReviewSubmitted({
  publicId,
  title,
  reviewer,
  recommendation,
  url,
}: {
  publicId: string;
  title: string;
  reviewer: string;
  recommendation: string;
  url: string;
}) {
  return (
    <Layout preview={`${publicId}: review received`} title="A review has been submitted">
      <Facts
        rows={[
          ["Submission", `${publicId}, “${title}”`],
          ["Reviewer", reviewer],
          ["Recommendation", recommendation],
        ]}
      />
      <Button href={url}>Open the submission</Button>
    </Layout>
  );
}
