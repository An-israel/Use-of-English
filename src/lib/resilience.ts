/**
 * Timeouts, retries with exponential backoff and jitter, and a circuit
 * breaker for calls to external services (engineering items 10–13).
 */

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms} ms`);
    this.name = "TimeoutError";
  }
}

/** Run `fn` with an AbortSignal that fires after `ms` (or when `outer` aborts). */
export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
  outer?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeoutError(ms)), ms);
  const onOuterAbort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", onOuterAbort, { once: true });
  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted && controller.signal.reason instanceof TimeoutError) {
      throw controller.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onOuterAbort);
  }
}

/** Full-jitter exponential backoff: random(0, min(cap, base·2^attempt)). */
export function backoffDelay(attempt: number, baseMs = 250, capMs = 8_000, random = Math.random): number {
  return Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt));
}

export type RetryOptions = {
  attempts?: number;
  baseMs?: number;
  capMs?: number;
  /** Return false for errors that must not be retried (e.g. 4xx) */
  retryable?: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function retry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseMs = 250, capMs = 8_000, retryable = () => true, sleep = defaultSleep } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === attempts - 1 || !retryable(err)) break;
      await sleep(backoffDelay(attempt, baseMs, capMs));
    }
  }
  throw lastErr;
}

export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`${name} is temporarily unavailable`);
    this.name = "CircuitOpenError";
  }
}

type BreakerState = { failures: number; openedAt: number | null };

/**
 * Circuit breaker. After `threshold` consecutive failures it opens for
 * `coolDownMs`; calls fail fast with CircuitOpenError so callers can queue the
 * work instead. State is per server instance by design: it protects that
 * instance from piling up slow calls, and the job queue (which retries from
 * the database) is the durable fallback.
 */
export function circuitBreaker(name: string, { threshold = 5, coolDownMs = 60_000, now = Date.now } = {}) {
  const state: BreakerState = { failures: 0, openedAt: null };
  return {
    get isOpen() {
      return state.openedAt !== null && now() - state.openedAt < coolDownMs;
    },
    async call<T>(fn: () => Promise<T>): Promise<T> {
      if (state.openedAt !== null) {
        if (now() - state.openedAt < coolDownMs) throw new CircuitOpenError(name);
        state.openedAt = null; // half-open: allow one trial call
        state.failures = threshold - 1;
      }
      try {
        const result = await fn();
        state.failures = 0;
        return result;
      } catch (err) {
        state.failures += 1;
        if (state.failures >= threshold) state.openedAt = now();
        throw err;
      }
    },
  };
}
