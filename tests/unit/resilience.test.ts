import { describe, expect, it } from "vitest";
import { backoffDelay, circuitBreaker, CircuitOpenError, retry, TimeoutError, withTimeout } from "@/lib/resilience";

describe("resilience", () => {
  it("backoff grows exponentially and is capped", () => {
    expect(backoffDelay(0, 100, 1000, () => 0.999)).toBe(99);
    expect(backoffDelay(3, 100, 1000, () => 0.999)).toBe(799);
    expect(backoffDelay(10, 100, 1000, () => 0.999)).toBe(999);
  });
  it("retries transient failures then succeeds", async () => {
    let n = 0;
    const result = await retry(async () => (++n < 3 ? Promise.reject(new Error("x")) : "ok"), {
      sleep: async () => {},
    });
    expect(result).toBe("ok");
    expect(n).toBe(3);
  });
  it("does not retry non-retryable errors", async () => {
    let n = 0;
    await expect(
      retry(
        async () => {
          n++;
          throw new Error("4xx");
        },
        { retryable: () => false, sleep: async () => {} },
      ),
    ).rejects.toThrow();
    expect(n).toBe(1);
  });
  it("times out", async () => {
    await expect(
      withTimeout((s) => new Promise((_, rej) => s.addEventListener("abort", () => rej(s.reason))), 10),
    ).rejects.toBeInstanceOf(TimeoutError);
  });
  it("opens the circuit after repeated failures and recovers after cool-down", async () => {
    let t = 0;
    const cb = circuitBreaker("svc", { threshold: 2, coolDownMs: 100, now: () => t });
    const fail = () => Promise.reject(new Error("down"));
    await expect(cb.call(fail)).rejects.toThrow("down");
    await expect(cb.call(fail)).rejects.toThrow("down");
    await expect(cb.call(async () => "ok")).rejects.toBeInstanceOf(CircuitOpenError);
    t = 200;
    await expect(cb.call(async () => "ok")).resolves.toBe("ok");
  });
});

describe("withDbRetry", () => {
  it("retries deadlocks and serialization failures, then succeeds", async () => {
    const { withDbRetry } = await import("@/lib/resilience");
    let calls = 0;
    const res = await withDbRetry(
      async () =>
        ++calls < 3
          ? { data: null, error: { code: calls === 1 ? "40P01" : "40001", message: "deadlock" } }
          : { data: 1, error: null },
      { sleep: async () => {} },
    );
    expect(res).toEqual({ data: 1, error: null });
    expect(calls).toBe(3);
  });
  it("returns other errors at once, and the last transient error after the attempts", async () => {
    const { withDbRetry } = await import("@/lib/resilience");
    let calls = 0;
    const other = await withDbRetry(async () => (calls++, { data: null, error: { code: "23505", message: "dup" } }), {
      sleep: async () => {},
    });
    expect(other.error?.code).toBe("23505");
    expect(calls).toBe(1);
    const stuck = await withDbRetry(async () => ({ data: null, error: { code: "40P01", message: "deadlock" } }), {
      attempts: 2,
      sleep: async () => {},
    });
    expect(stuck.error?.code).toBe("40P01");
  });
});
