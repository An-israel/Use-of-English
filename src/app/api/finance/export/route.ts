import { NextResponse, connection, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { RATE_LIMITS, rateLimit } from "@/lib/api/rate-limit";
import {
  FEE_LABEL,
  LEDGER_CSV_HEADER,
  PAYMENT_STATUS_LABEL,
  fundByYear,
  ledgerCsvRow,
  monthLabel,
  naira,
  parseFilters,
  toCsv,
  totals,
  type FeeType,
} from "@/lib/finance";
import { allLedgerRows, issueOptions } from "@/lib/finance-data";
import { formatDate, formatNairaPlain } from "@/lib/format";
import { isPaymentTestMode } from "@/lib/payments/paystack";
import { renderFundStatement, renderPaymentsReport } from "@/lib/pdf/documents";
import { adminClient, userClient } from "@/lib/supabase/clients";

/** Rows listed in the PDF; the totals always cover everything. */
const PDF_ROWS = 400;

/**
 * Financial exports (brief section 7.3): the payments ledger as CSV or PDF
 * with the page's filters, or the fund statement. Finance Officer and Super
 * Admin only; every export is written to the audit log.
 */
export async function GET(req: NextRequest) {
  await connection();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  if (!["super_admin", "finance_officer"].includes(viewer.role))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const limit = await rateLimit(req, RATE_LIMITS.financeExport, viewer.id);
  if (!limit.allowed)
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );

  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const format = sp.format === "pdf" ? "pdf" : "csv";
  const kind = sp.kind === "fund" ? "fund" : "ledger";
  const f = kind === "fund" ? parseFilters({}) : parseFilters(sp);
  const db = await userClient();
  const rows = await allLedgerRows(db, f);
  const t = totals(rows);
  const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  let testMode = true;
  try {
    testMode = isPaymentTestMode();
  } catch {
    // misconfigured payments count as test mode on documents
  }

  await adminClient()
    .from("audit_log")
    .insert({
      actor_id: viewer.id,
      actor_email: viewer.email,
      action: "finance_export",
      table_name: "payments",
      changes: { kind, format, filters: f, rows: rows.length },
    });

  if (kind === "fund") {
    const { data: refunds } = await db.from("refunds").select("amount_kobo, refunded_on");
    const years = fundByYear(rows, refunds ?? []);
    const header = ["Year", "Payments", "Collected (NGN)", "Refunds (NGN)", "Net (NGN)", "Waived"];
    if (format === "csv")
      return file(
        toCsv(
          header,
          years.map((y) => [y.year, y.payments, naira(y.collected), naira(y.refunded), naira(y.net), y.waived]),
        ),
        `JHTS_fund_statement_${stamp}.csv`,
        "text/csv; charset=utf-8",
      );
    const pdf = await renderFundStatement({
      generated: formatDate(new Date().toISOString()),
      testMode,
      tiles: [
        ["Collected", formatNairaPlain(t.all.collected)],
        ["Refunds", formatNairaPlain(t.all.refunded)],
        ["Net", formatNairaPlain(t.all.net)],
      ],
      years: years.map((y) => [
        y.year,
        String(y.payments),
        formatNairaPlain(y.collected),
        formatNairaPlain(y.refunded),
        formatNairaPlain(y.net),
        String(y.waived),
      ]),
      byFee: feeRows(t.byFee),
    });
    return file(pdf, `JHTS_fund_statement_${stamp}.pdf`, "application/pdf");
  }

  if (format === "csv")
    return file(
      toCsv(LEDGER_CSV_HEADER, rows.map(ledgerCsvRow)),
      `JHTS_payments_${stamp}.csv`,
      "text/csv; charset=utf-8",
    );

  const issues = f.issue ? await issueOptions(db) : [];
  const filterText =
    [
      f.from || f.to
        ? `${f.from ? formatDate(f.from) : "the start"} to ${f.to ? formatDate(f.to) : "today"}`
        : "All dates",
      f.fee ? FEE_LABEL[f.fee] : null,
      f.status ? PAYMENT_STATUS_LABEL[f.status] : null,
      f.issue ? (issues.find((i) => i.value === f.issue)?.label ?? "One issue") : null,
    ]
      .filter(Boolean)
      .join(" · ") + ` · ${rows.length} payment records`;
  const pdf = await renderPaymentsReport({
    title: "JHTS payments report",
    filters: filterText,
    generated: formatDate(new Date().toISOString()),
    testMode,
    tiles: [
      ["Collected", formatNairaPlain(t.all.collected)],
      ["Refunded", formatNairaPlain(t.all.refunded)],
      ["Net", formatNairaPlain(t.all.net)],
      ["Waived", String(t.all.waived)],
    ],
    byMonth: t.byMonth.map((m) => [
      monthLabel(m.month),
      String(m.payments),
      formatNairaPlain(m.collected),
      formatNairaPlain(m.refunded),
      formatNairaPlain(m.net),
    ]),
    byFee: feeRows(t.byFee),
    rows: rows
      .slice(0, PDF_ROWS)
      .map((r) => [
        r.reference,
        formatDate(r.activity_at),
        FEE_LABEL[r.fee_type],
        PAYMENT_STATUS_LABEL[r.status],
        r.public_id ?? "",
        r.payer_name || r.payer_email,
        formatNairaPlain(r.amount_kobo),
        r.refunded_kobo ? formatNairaPlain(r.refunded_kobo) : "",
        formatNairaPlain(r.net_kobo),
      ]),
    truncated: Math.max(0, rows.length - PDF_ROWS),
  });
  return file(pdf, `JHTS_payments_${stamp}.pdf`, "application/pdf");
}

function feeRows(byFee: ReturnType<typeof totals>["byFee"]): string[][] {
  return (Object.keys(FEE_LABEL) as FeeType[]).map((k) => [
    FEE_LABEL[k],
    String(byFee[k].payments),
    formatNairaPlain(byFee[k].net),
    String(byFee[k].waived),
  ]);
}

function file(body: string | Buffer, name: string, type: string) {
  return new NextResponse(typeof body === "string" ? body : new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
