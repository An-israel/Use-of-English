import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sign, verifySignature } from "@/lib/payments/paystack";

const secret = "sk_test_abc123";
const body = JSON.stringify({ event: "charge.success", data: { reference: "JHTS-RF-2027-0042-1", amount: 500000 } });

describe("Paystack webhook signature", () => {
  it("accepts the HMAC SHA-512 of the raw body", () => {
    const sig = createHmac("sha512", secret).update(body).digest("hex");
    expect(verifySignature(body, sig, secret)).toBe(true);
    expect(sign(body, secret)).toBe(sig);
  });
  it("rejects a missing, wrong or truncated signature", () => {
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, sign(body, "sk_test_other"), secret)).toBe(false);
    expect(verifySignature(body, sign(body, secret).slice(0, 64), secret)).toBe(false);
  });
  it("rejects a body changed after signing", () => {
    const sig = sign(body, secret);
    expect(verifySignature(body.replace("500000", "1"), sig, secret)).toBe(false);
  });
  it("is sensitive to whitespace (the raw body must be used, not re-serialised JSON)", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifySignature(pretty, sign(body, secret), secret)).toBe(false);
  });
});
