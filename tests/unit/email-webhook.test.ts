import { describe, expect, it } from "vitest";
import { signWebhook, verifyWebhook } from "@/lib/email/webhook";

const secret = `whsec_${Buffer.from("jhts-test-signing-secret-0123456789").toString("base64")}`;
const body = JSON.stringify({ type: "email.bounced", data: { email_id: "e1", to: ["a@example.test"] } });
const now = 1_800_000_000;
const ts = String(now);

describe("email webhook verification", () => {
  it("accepts a correctly signed, fresh request (also among rotated signatures)", () => {
    const sig = signWebhook(secret, "msg_1", ts, body);
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, body, now)).toBe(true);
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: ts, signature: `v1,old== v1,${sig}` }, body, now)).toBe(
      true,
    );
  });
  it("rejects tampering, wrong ids, missing headers and other secrets", () => {
    const sig = signWebhook(secret, "msg_1", ts, body);
    expect(
      verifyWebhook(
        secret,
        { id: "msg_1", timestamp: ts, signature: `v1,${sig}` },
        body.replace("bounced", "delivered"),
        now,
      ),
    ).toBe(false);
    expect(verifyWebhook(secret, { id: "msg_2", timestamp: ts, signature: `v1,${sig}` }, body, now)).toBe(false);
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: ts, signature: null }, body, now)).toBe(false);
    const other = `whsec_${Buffer.from("another-secret-entirely-xxxxxxxxx").toString("base64")}`;
    expect(verifyWebhook(other, { id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, body, now)).toBe(false);
  });
  it("rejects replays outside five minutes", () => {
    const old = String(now - 301);
    const sig = signWebhook(secret, "msg_1", old, body);
    expect(verifyWebhook(secret, { id: "msg_1", timestamp: old, signature: `v1,${sig}` }, body, now)).toBe(false);
  });
});
