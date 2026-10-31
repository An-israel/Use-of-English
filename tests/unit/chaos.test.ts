import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Failure drills (item 87): the email provider, Paystack, the database and
 * Storage fail, and the site degrades the way docs/RUNBOOK.md says it should.
 */

// A tiny stand-in for the Supabase client: records writes, can be told to fail.
const db = {
  down: false,
  updates: [] as { table: string; patch: Record<string, unknown> }[],
};
function query(table: string) {
  const q = {
    select: () => q,
    eq: () => q,
    in: () => q,
    maybeSingle: async () =>
      db.down ? { data: null, error: { message: "connect ECONNREFUSED" } } : { data: null, error: null },
    single: async () => ({ data: { id: "row-1" }, error: null }),
    upsert: () => q,
    update: (patch: Record<string, unknown>) => {
      db.updates.push({ table, patch });
      return q;
    },
    then: (r: (v: unknown) => void) => r({ data: null, error: null }),
  };
  return q;
}
const fakeClient = {
  from: query,
  rpc: async () => (db.down ? { data: null, error: { message: "connect ECONNREFUSED" } } : { data: true, error: null }),
  storage: {
    getBucket: async () =>
      db.down ? { data: null, error: { message: "storage unavailable" } } : { data: {}, error: null },
  },
};
vi.mock("@/lib/supabase/clients", () => ({ adminClient: () => fakeClient, publicClient: () => fakeClient }));

const resendSend = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

beforeEach(() => {
  vi.resetModules();
  db.down = false;
  db.updates = [];
  resendSend.mockReset();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key-for-tests-0123456789");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the email provider is down", () => {
  it("marks the email failed so the queue retries it, then stops calling the provider (circuit open)", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    resendSend.mockRejectedValue(new Error("503 Service Unavailable"));
    const { sendEmail } = await import("@/lib/email/send");
    const send = (n: number) =>
      sendEmail({
        to: "a@example.test",
        subject: "s",
        template: "t",
        element: createElement("p", null, "hi"),
        dedupeKey: `k${n}`,
      });

    for (let n = 0; n < 4; n++) await expect(send(n)).rejects.toThrow("503");
    expect(db.updates.filter((u) => u.table === "email_outbox" && u.patch.status === "failed")).toHaveLength(4);
    // After four failures the breaker opens: the next send fails fast without calling Resend.
    await expect(send(5)).rejects.toThrow(/temporarily unavailable/);
    expect(resendSend).toHaveBeenCalledTimes(4);
  });
});

describe("Paystack is unreachable", () => {
  it("retries network errors with backoff, then fails fast once the breaker opens", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_123");
    vi.stubEnv("PAYSTACK_MODE", "");
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { paystack } = await import("@/lib/payments/paystack");
    for (let i = 0; i < 2; i++) {
      const p = paystack().verify(`REF-${i}`);
      const done = expect(p).rejects.toThrow("fetch failed");
      await vi.runAllTimersAsync();
      await done;
    }
    expect(fetchMock).toHaveBeenCalledTimes(6); // 3 attempts per call
    vi.useRealTimers();
    // Two more failing calls trip the breaker (threshold 4)…
    for (let i = 0; i < 2; i++) await expect(paystack().verify("x")).rejects.toThrow();
    const before = fetchMock.mock.calls.length;
    // …after which Paystack is not called at all, and the author sees "try again later".
    await expect(paystack().verify("y")).rejects.toThrow(/temporarily unavailable/);
    expect(fetchMock.mock.calls.length).toBe(before);
  }, 30_000);
});

describe("the database or Storage is down", () => {
  it("the health checks report the failing dependencies (the route then answers 503)", async () => {
    db.down = true;
    const { dependencyChecks } = await import("@/lib/health/checks");
    const checks = await dependencyChecks();
    expect(checks.database).toMatchObject({ ok: false, error: "connect ECONNREFUSED" });
    expect(checks.storage).toMatchObject({ ok: false, error: "storage unavailable" });
    db.down = false;
    const healthy = await dependencyChecks();
    expect(healthy.database.ok && healthy.storage.ok).toBe(true);
  });
  it("counting a view or download never breaks reading", async () => {
    db.down = true;
    const { recordMetric } = await import("@/lib/metrics");
    const headers = new Headers({
      "user-agent": "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/131 Safari/537.36",
    });
    await expect(recordMetric(headers, { kind: "download", articleId: "a", format: "pdf" })).resolves.toBe(false);
  });
});
