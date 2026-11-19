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
      <P>Thank you. Your payment has been confirmed.</P>
      <Facts
        rows={[
          ["Receipt number", receiptNumber],
          ["Fee", feeLabel],
          ["Amount", amount],
          ["Date", paidAt],
          ["Payment reference", reference],
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
            borderLeft: "2px solid #E1B521",
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
    <Layout preview={`Invitation to review: ${title}`} title="Will you review a manuscript for JHTCS?">
      <P>Dear {name},</P>
      <P>
        The editors of the Journal of Humanities and Transcultural Studies invite you to review the manuscript “{title}
        ”. Review is double-blind: the authors’ names are withheld.
      </P>
      <blockquote
        style={{
          borderLeft: "2px solid #E1B521",
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

export function TransferReceived({
  name,
  feeLabel,
  amount,
  publicId,
  url,
}: {
  name: string;
  feeLabel: string;
  amount: string;
  publicId: string;
  url: string;
}) {
  return (
    <Layout preview={`We have your proof of payment for ${publicId}`} title="Proof of payment received">
      <P>Dear {name},</P>
      <P>
        Thank you. We have received the receipt for your bank transfer. The Finance Officer will confirm the payment as
        soon as it shows in the journal’s account, and we will then email you an official receipt.
      </P>
      <Facts
        rows={[
          ["Fee", feeLabel],
          ["Amount", amount],
          ["Submission ID", publicId],
        ]}
      />
      <Button href={url}>Open your submission</Button>
    </Layout>
  );
}

export function TransferNotAccepted({
  name,
  feeLabel,
  amount,
  publicId,
  reason,
  url,
}: {
  name: string;
  feeLabel: string;
  amount: string;
  publicId: string;
  reason: string;
  url: string;
}) {
  return (
    <Layout preview={`We couldn’t confirm your payment for ${publicId}`} title="We couldn’t confirm your payment">
      <P>Dear {name},</P>
      <P>We were not able to confirm your bank transfer for the {feeLabel.toLowerCase()}.</P>
      <Facts
        rows={[
          ["Reason", reason],
          ["Amount due", amount],
          ["Submission ID", publicId],
        ]}
      />
      <P>
        Please check the details on your submission page and upload the correct receipt. If you believe the payment has
        been made, reply to this email with the transfer details.
      </P>
      <Button href={url}>Open your submission</Button>
    </Layout>
  );
}

export function ReviewReminder({
  name,
  title,
  due,
  overdue,
  url,
}: {
  name: string;
  title: string;
  due: string;
  overdue: boolean;
  url: string;
}) {
  return (
    <Layout
      preview={overdue ? `Your review is overdue: ${title}` : `Your review is due ${due}`}
      title={overdue ? "Your review is overdue" : "A gentle reminder"}
    >
      <P>Dear {name},</P>
      <P>
        {overdue
          ? `Your review of “${title}” was due on ${due}. If you need more time, reply to this email and the editors will adjust the date.`
          : `Your review of “${title}” is due on ${due}. Thank you for making time for it.`}
      </P>
      <Button href={url}>Open the review</Button>
    </Layout>
  );
}

export function OpsAlert({ subject, lines, url }: { subject: string; lines: string[]; url: string }) {
  return (
    <Layout preview={subject} title={subject}>
      {lines.map((l) => (
        <P key={l}>{l}</P>
      ))}
      <Button href={url}>Open the System screen</Button>
    </Layout>
  );
}

const AUTH_COPY = {
  signup: {
    title: "Confirm your email address",
    lead: "Thank you for creating a JHTCS author account. Please confirm your email address to finish setting it up.",
    button: "Confirm my email",
    ignore: "If you did not create an account, you can ignore this email.",
  },
  recovery: {
    title: "Reset your password",
    lead: "We received a request to reset the password for your JHTCS account. Choose a new password with the button below.",
    button: "Choose a new password",
    ignore: "If you did not ask for this, you can ignore this email; your password stays the same.",
  },
  invite: {
    title: "You have been invited to JHTCS",
    lead: "You have been invited to join the Journal of Humanities and Transcultural Studies. Accept the invitation to choose your password and open your account.",
    button: "Accept the invitation",
    ignore: "If you were not expecting this invitation, you can ignore this email.",
  },
  magiclink: {
    title: "Sign in to JHTCS",
    lead: "Use the button below to sign in to your JHTCS account.",
    button: "Sign in",
    ignore: "If you did not ask to sign in, you can ignore this email.",
  },
  email_change: {
    title: "Confirm your new email address",
    lead: "Please confirm the change of email address for your JHTCS account.",
    button: "Confirm the change",
    ignore: "If you did not ask for this change, please contact the editorial office.",
  },
  reauthentication: {
    title: "Your confirmation code",
    lead: "Enter this code on the JHTCS website to confirm it is you.",
    button: "",
    ignore: "If you did not ask for a code, you can ignore this email.",
  },
} as const;

/** Sign-up, password, invitation and email-change messages (sent for Supabase Auth through its Send Email hook). */
export function AuthMessage({
  kind,
  name,
  link,
  code,
  newEmail,
}: {
  kind: keyof typeof AUTH_COPY;
  name?: string;
  link: string | null;
  code: string | null;
  newEmail?: string;
}) {
  const c = AUTH_COPY[kind];
  return (
    <Layout preview={c.title} title={c.title}>
      <P>{name ? `Dear ${name},` : "Hello,"}</P>
      <P>{c.lead}</P>
      {kind === "email_change" && newEmail ? <P>New address: {newEmail}</P> : null}
      {code ? <Facts rows={[["Code", code]]} /> : null}
      {link ? <Button href={link}>{c.button}</Button> : null}
      {link ? <P>If the button does not work, copy this link into your browser: {link}</P> : null}
      <P>{c.ignore} The link or code expires in one hour.</P>
    </Layout>
  );
}
