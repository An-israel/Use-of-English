/**
 * Verification of the email provider's webhooks (Resend signs them the Svix
 * way, item 101): HMAC SHA-256 over "id.timestamp.body" with the endpoint
 * secret, compared in constant time, and rejected outside a 5-minute window
 * so a captured request can't be replayed later.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const TOLERANCE_SECONDS = 300;

export function signWebhook(secret: string, id: string, timestamp: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
}

export function verifyWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(signWebhook(secret, id, timestamp, body));
  // The header may carry several space-separated "v1,<base64>" signatures (key rotation).
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
