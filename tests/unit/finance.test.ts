import { describe, expect, it } from "vitest";
import { csvCell, dateBounds, parseFilters, toCsv, totals, type LedgerRow } from "@/lib/finance";

const row = (p: Partial<LedgerRow>): LedgerRow => ({
  id: "1",
  reference: "JHTS-RF-2027-0001-1",
  fee_type: "review",
  status: "success",
  amount_kobo: 500_000,
  refunded_kobo: 0,
  net_kobo: 500_000,
  paid_at: "2027-03-10T09:00:00Z",
  created_at: "2027-03-10T08:59:00Z",
  activity_at: "2027-03-10T09:00:00Z",
  channel: "card",
  receipt_number: "JHTS-R-2027-000001",
  waiver_reason: null,
  submission_id: "s",
  public_id: "JHTS-2027-0001",
  title: "T",
  payer_name: "P",
  payer_email: "p@example.test",
  issue_id: null,
  ...p,
});

describe("finance helpers", () => {
  it("parses only valid filters", () => {
    expect(parseFilters({ from: "2027-01-01", to: "bad", fee: "review", status: "nope", issue: "x" })).toEqual({
      from: "2027-01-01",
      to: null,
      fee: "review",
      status: null,
      issue: null,
    });
  });
  it("turns inclusive Lagos dates into UTC bounds", () => {
    expect(dateBounds(parseFilters({ from: "2027-03-01", to: "2027-03-31" }))).toEqual({
      gte: "2027-02-28T23:00:00.000Z",
      lt: "2027-03-31T23:00:00.000Z",
    });
  });
  it("totals by month and fee, counting refunds and waivers", () => {
    const t = totals([
      row({}),
      row({
        id: "2",
        fee_type: "publication",
        amount_kobo: 2_000_000,
        net_kobo: 1_500_000,
        refunded_kobo: 500_000,
        paid_at: "2027-04-02T10:00:00Z",
      }),
      row({ id: "3", status: "waived", amount_kobo: 0, net_kobo: 0, paid_at: null }),
      row({ id: "4", status: "failed", net_kobo: 0, paid_at: null }),
    ]);
    expect(t.all).toEqual({ payments: 2, collected: 2_500_000, refunded: 500_000, net: 2_000_000, waived: 1 });
    expect(t.byFee.publication.net).toBe(1_500_000);
    expect(t.byMonth.map((m) => m.month)).toEqual(["2027-04", "2027-03"]);
  });
  it("assigns a payment just after midnight in Lagos to the new month", () => {
    expect(totals([row({ paid_at: "2027-03-31T23:30:00Z" })]).byMonth[0].month).toBe("2027-04");
  });
  it("escapes CSV and neutralises formulas", () => {
    expect(csvCell('He said "hi", then left')).toBe('"He said ""hi"", then left"');
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell(-5)).toBe("-5");
    expect(toCsv(["a"], [["b"]])).toBe("﻿a\r\nb\r\n");
  });
});

describe("fund statement", () => {
  it("counts refunds in the year they were made", async () => {
    const { fundByYear } = await import("@/lib/finance");
    const years = fundByYear(
      [
        row({ paid_at: "2027-12-20T10:00:00Z", amount_kobo: 2_000_000 }),
        row({ id: "2", status: "waived", paid_at: null, activity_at: "2028-01-05T10:00:00Z" }),
      ],
      [{ amount_kobo: 500_000, refunded_on: "2028-01-10" }],
    );
    expect(years).toEqual([
      { year: "2028", collected: 0, refunded: 500_000, net: -500_000, payments: 0, waived: 1 },
      { year: "2027", collected: 2_000_000, refunded: 0, net: 2_000_000, payments: 1, waived: 0 },
    ]);
  });
});
