import { describe, expect, it } from "vitest";
import { compare, lagosDay } from "@/lib/payments/reconcile";

const db = (reference: string, status = "success", amountKobo = 500_000) => ({
  id: `id-${reference}`,
  reference,
  status,
  amountKobo,
});
const ps = (reference: string, status = "success", amountKobo = 500_000, currency = "NGN") => ({
  reference,
  status,
  amountKobo,
  currency,
});

describe("reconciliation", () => {
  it("is quiet when both sides agree", () => {
    expect(compare([db("A"), db("B", "refunded")], [ps("A"), ps("B"), ps("C", "abandoned")])).toEqual([]);
  });
  it("flags money Paystack received that we have no record of", () => {
    expect(compare([], [ps("X")])).toMatchObject([{ kind: "missing_in_db", reference: "X", paymentId: null }]);
  });
  it("flags a payment we marked paid that Paystack doesn't have", () => {
    expect(compare([db("Y")], [])).toMatchObject([{ kind: "missing_in_paystack", reference: "Y", paymentId: "id-Y" }]);
  });
  it("flags a missed webhook (Paystack paid, we still pending)", () => {
    expect(compare([db("P", "pending")], [ps("P")])).toMatchObject([
      { kind: "status_mismatch", details: { db_status: "pending", paystack_status: "success" } },
    ]);
  });
  it("flags a payment we marked paid that Paystack reports as failed", () => {
    expect(compare([db("F")], [ps("F", "failed")])).toMatchObject([{ kind: "status_mismatch", reference: "F" }]);
  });
  it("flags different amounts and foreign currencies", () => {
    expect(compare([db("M")], [ps("M", "success", 400_000)])).toMatchObject([
      { kind: "amount_mismatch", details: { db_amount_kobo: 500_000, paystack_amount_kobo: 400_000 } },
    ]);
    expect(compare([db("U")], [ps("U", "success", 500_000, "USD")])[0].kind).toBe("amount_mismatch");
  });
  it("uses the Lagos calendar day", () => {
    expect(lagosDay("2027-03-01")).toEqual({ from: "2027-02-28T23:00:00.000Z", to: "2027-03-01T23:00:00.000Z" });
    expect(() => lagosDay("1 March")).toThrow();
  });
});
