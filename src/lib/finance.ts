/**
 * Finance views (brief section 7.3): filters, totals and CSV. Pure helpers,
 * shared by the admin pages and the export route.
 */

export const FEE_LABEL = { review: "Review fee", publication: "Publication fee" } as const;
export const PAYMENT_STATUS_LABEL = {
  pending: "Pending",
  success: "Paid",
  failed: "Failed",
  abandoned: "Abandoned",
  waived: "Waived",
  refunded: "Refunded",
} as const;
export type FeeType = keyof typeof FEE_LABEL;
export type PaymentStatus = keyof typeof PAYMENT_STATUS_LABEL;

export type FinanceFilters = {
  from: string | null;
  to: string | null;
  fee: FeeType | null;
  status: PaymentStatus | null;
  issue: string | null;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFilters(sp: Record<string, string | undefined>): FinanceFilters {
  return {
    from: sp.from && DATE.test(sp.from) ? sp.from : null,
    to: sp.to && DATE.test(sp.to) ? sp.to : null,
    fee: sp.fee && sp.fee in FEE_LABEL ? (sp.fee as FeeType) : null,
    status: sp.status && sp.status in PAYMENT_STATUS_LABEL ? (sp.status as PaymentStatus) : null,
    issue: sp.issue && UUID.test(sp.issue) ? sp.issue : null,
  };
}

export function filtersToQuery(f: FinanceFilters): string {
  return new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
}

/** Inclusive Lagos dates → the UTC bounds used on activity_at (paid, or created if unpaid). */
export function dateBounds(f: FinanceFilters): { gte: string | null; lt: string | null } {
  return {
    gte: f.from ? new Date(`${f.from}T00:00:00+01:00`).toISOString() : null,
    lt: f.to ? new Date(new Date(`${f.to}T00:00:00+01:00`).getTime() + 86_400_000).toISOString() : null,
  };
}

export type LedgerRow = {
  id: string;
  reference: string;
  fee_type: FeeType;
  status: PaymentStatus;
  amount_kobo: number;
  refunded_kobo: number;
  net_kobo: number;
  paid_at: string | null;
  created_at: string;
  activity_at: string;
  channel: string | null;
  receipt_number: string | null;
  waiver_reason: string | null;
  submission_id: string;
  public_id: string | null;
  title: string;
  payer_name: string;
  payer_email: string;
  issue_id: string | null;
};

export const LEDGER_COLUMNS =
  "id, reference, fee_type, status, amount_kobo, refunded_kobo, net_kobo, paid_at, created_at, activity_at, channel, receipt_number, waiver_reason, submission_id, public_id, title, payer_name, payer_email, issue_id";

const PAID: PaymentStatus[] = ["success", "refunded"];

export type Totals = { payments: number; collected: number; refunded: number; net: number; waived: number };
const zero = (): Totals => ({ payments: 0, collected: 0, refunded: 0, net: 0, waived: 0 });

function add(t: Totals, r: LedgerRow) {
  if (PAID.includes(r.status)) {
    t.payments += 1;
    t.collected += r.amount_kobo;
    t.refunded += r.refunded_kobo;
    t.net += r.net_kobo;
  } else if (r.status === "waived") t.waived += 1;
}

/** "2027-03" in Lagos time. */
export function monthOf(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit" }).format(
    new Date(iso),
  );
}

/** Totals overall, by month (newest first) and by fee type. Money received counts by its payment date. */
export function totals(rows: LedgerRow[]) {
  const all = zero();
  const byMonth = new Map<string, Totals>();
  const byFee: Record<FeeType, Totals> = { review: zero(), publication: zero() };
  for (const r of rows) {
    add(all, r);
    add(byFee[r.fee_type], r);
    const m = monthOf(r.paid_at ?? r.activity_at);
    if (!byMonth.has(m)) byMonth.set(m, zero());
    add(byMonth.get(m)!, r);
  }
  return {
    all,
    byFee,
    byMonth: [...byMonth.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([month, t]) => ({ month, ...t })),
  };
}

/** Naira with two decimals and no symbol, for spreadsheets. */
export const naira = (kobo: number) => (kobo / 100).toFixed(2);

/**
 * One CSV cell. Quotes when needed, and neutralises cells a spreadsheet
 * would treat as a formula (CSV injection: =, +, -, @, tab, CR).
 */
export function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  // BOM so Excel opens UTF-8 (₦, accented names) correctly.
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const LEDGER_CSV_HEADER = [
  "Reference",
  "Fee",
  "Status",
  "Amount (NGN)",
  "Refunded (NGN)",
  "Net (NGN)",
  "Paid at",
  "Created at",
  "Channel",
  "Receipt",
  "Submission",
  "Title",
  "Payer",
  "Payer email",
  "Waiver reason",
];

export function ledgerCsvRow(r: LedgerRow): (string | number | null)[] {
  return [
    r.reference,
    FEE_LABEL[r.fee_type],
    PAYMENT_STATUS_LABEL[r.status],
    naira(r.amount_kobo),
    naira(r.refunded_kobo),
    naira(r.net_kobo),
    r.paid_at,
    r.created_at,
    r.channel,
    r.receipt_number,
    r.public_id,
    r.title,
    r.payer_name,
    r.payer_email,
    r.waiver_reason,
  ];
}

export type FundYear = {
  year: string;
  collected: number;
  refunded: number;
  net: number;
  payments: number;
  waived: number;
};

/**
 * The fund statement by calendar year (Lagos): money in by payment date,
 * refunds by the date they were made, net as the difference.
 */
export function fundByYear(rows: LedgerRow[], refunds: { amount_kobo: number; refunded_on: string }[]): FundYear[] {
  const years = new Map<string, FundYear>();
  const get = (y: string) => {
    if (!years.has(y)) years.set(y, { year: y, collected: 0, refunded: 0, net: 0, payments: 0, waived: 0 });
    return years.get(y)!;
  };
  for (const r of rows) {
    if (PAID.includes(r.status) && r.paid_at) {
      const y = get(monthOf(r.paid_at).slice(0, 4));
      y.collected += r.amount_kobo;
      y.payments += 1;
    } else if (r.status === "waived") get(monthOf(r.activity_at).slice(0, 4)).waived += 1;
  }
  for (const f of refunds) get(f.refunded_on.slice(0, 4)).refunded += f.amount_kobo;
  for (const y of years.values()) y.net = y.collected - y.refunded;
  return [...years.values()].sort((a, b) => b.year.localeCompare(a.year));
}

/** "2027-03" → "March 2027" */
export function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(y, mo - 1, 15),
  );
}
