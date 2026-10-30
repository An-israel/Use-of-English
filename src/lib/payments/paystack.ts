import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";
import { siteUrl } from "@/lib/env";
import { circuitBreaker, retry, withTimeout } from "@/lib/resilience";

/**
 * Paystack (NGN) through the server-side Transaction API (brief section 7).
 * The webhook is the source of truth; the callback page only displays status.
 *
 * PAYSTACK_MODE=mock swaps in a local simulated checkout so the whole flow
 * can be exercised before the Unit's test keys exist. It is refused in
 * production deployments.
 */

export type InitResult = { authorizationUrl: string; accessCode?: string };
export type Verified = {
  reference: string;
  status: "success" | "failed" | "abandoned" | "pending" | string;
  amountKobo: number;
  currency: string;
  paystackId: number | null;
  channel: string | null;
  paidAt: string | null;
  raw: unknown;
};

export interface PaystackClient {
  mode: "live" | "test" | "mock";
  initialize(input: {
    email: string;
    amountKobo: number;
    reference: string;
    callbackUrl: string;
    metadata: Record<string, unknown>;
  }): Promise<InitResult>;
  verify(reference: string): Promise<Verified>;
}

export class PaystackError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

const breaker = circuitBreaker("Paystack", { threshold: 4, coolDownMs: 60_000 });
const API = "https://api.paystack.co";

function mockAllowed() {
  return process.env.PAYSTACK_MODE === "mock" && process.env.VERCEL_ENV !== "production";
}

/** The secret used to sign webhooks; the mock uses a fixed local secret. */
export function webhookSecret(): string | null {
  if (mockAllowed()) return "sk_test_mock_local_only";
  return serverEnv.PAYSTACK_SECRET_KEY ?? null;
}

/** HMAC SHA-512 of the raw body with the secret key, compared in constant time. */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sign(rawBody: string, secret: string): string {
  return createHmac("sha512", secret).update(rawBody).digest("hex");
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = serverEnv.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError("PAYSTACK_SECRET_KEY is not set");
  return breaker.call(() =>
    retry(
      async () => {
        const res = await withTimeout(
          (signal) =>
            fetch(API + path, {
              ...init,
              signal,
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
            }),
          10_000,
        );
        const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
        if (!res.ok || body.status === false)
          throw new PaystackError(body.message ?? `Paystack error ${res.status}`, res.status);
        return body.data as T;
      },
      // Retry network errors and 5xx; never retry 4xx (a bad request stays bad).
      { attempts: 3, retryable: (e) => !(e instanceof PaystackError && e.status !== undefined && e.status < 500) },
    ),
  );
}

const realClient: PaystackClient = {
  get mode() {
    return serverEnv.PAYSTACK_SECRET_KEY?.startsWith("sk_live_") ? ("live" as const) : ("test" as const);
  },
  async initialize({ email, amountKobo, reference, callbackUrl, metadata }) {
    const data = await call<{ authorization_url: string; access_code: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: amountKobo,
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata,
        channels: ["card", "bank", "ussd", "bank_transfer"],
      }),
    });
    return { authorizationUrl: data.authorization_url, accessCode: data.access_code };
  },
  async verify(reference) {
    const d = await call<{
      reference: string;
      status: string;
      amount: number;
      currency: string;
      id: number;
      channel: string;
      paid_at: string | null;
    }>(`/transaction/verify/${encodeURIComponent(reference)}`);
    return {
      reference: d.reference,
      status: d.status,
      amountKobo: d.amount,
      currency: d.currency,
      paystackId: d.id,
      channel: d.channel,
      paidAt: d.paid_at,
      raw: d,
    };
  },
};

/** Simulated checkout for development and automated tests. */
const mockClient: PaystackClient = {
  mode: "mock",
  async initialize({ reference, amountKobo, callbackUrl }) {
    const u = new URL("/dev/paystack", siteUrl);
    u.searchParams.set("reference", reference);
    u.searchParams.set("amount", String(amountKobo));
    u.searchParams.set("callback", callbackUrl);
    return { authorizationUrl: u.toString() };
  },
  async verify(reference) {
    // The mock checkout records its outcome on the payment row before sending the webhook.
    const { adminClient } = await import("@/lib/supabase/clients");
    const { data } = await adminClient()
      .from("payments")
      .select("amount_kobo, currency, raw")
      .eq("reference", reference)
      .maybeSingle();
    // Before the webhook the outcome sits in mock_outcome; once applied, raw holds the verified result.
    const raw = data?.raw as { mock_outcome?: string; outcome?: string } | null;
    const outcome = raw?.mock_outcome ?? raw?.outcome ?? "pending";
    return {
      reference,
      status: outcome,
      amountKobo: data?.amount_kobo ?? 0,
      currency: data?.currency ?? "NGN",
      paystackId: outcome === "success" ? Math.floor(Date.now() / 1000) : null,
      channel: outcome === "success" ? "card" : null,
      paidAt: outcome === "success" ? new Date().toISOString() : null,
      raw: { mock: true, reference, outcome },
    };
  },
};

export function paystack(): PaystackClient {
  if (process.env.PAYSTACK_MODE === "mock") {
    if (!mockAllowed()) throw new PaystackError("The mock payment mode is disabled in production");
    return mockClient;
  }
  return realClient;
}

export const isPaymentTestMode = () => paystack().mode !== "live";
