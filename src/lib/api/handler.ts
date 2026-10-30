import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requestLogger, type Logger } from "@/lib/log";
import { siteUrl } from "@/lib/env";
import { rateLimit, type RateLimitRule } from "@/lib/api/rate-limit";

/**
 * Shared wrapper for route handlers: the "API gateway" layer (item 5).
 * It gives every handler a request id and logger, rate limiting, origin
 * checks for mutations (CSRF, item 77), zod validation and a consistent
 * error shape. Handlers never leak stack traces to clients.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public headers?: Record<string, string>,
  ) {
    super(message);
  }
}

type Ctx<P> = { req: NextRequest; log: Logger; requestId: string; params: P };

type Options = {
  rateLimit?: RateLimitRule;
  /** Mutating routes must come from our own origin. Webhooks opt out. */
  checkOrigin?: boolean;
  /** Public read-only API routes allow any origin (item 76). */
  cors?: "public" | "same-origin";
};

export function handler<P = Record<string, string>>(fn: (ctx: Ctx<P>) => Promise<Response>, opts: Options = {}) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID();
    const log = requestLogger(requestId, { method: req.method, path: req.nextUrl.pathname });
    const started = performance.now();
    let res: Response;
    try {
      const mutating = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      if (mutating && opts.checkOrigin !== false) assertSameOrigin(req);
      if (opts.rateLimit) {
        const rl = await rateLimit(req, opts.rateLimit);
        if (!rl.allowed) {
          throw new ApiError(429, "rate_limited", "Too many requests. Please wait and try again.", {
            "Retry-After": String(rl.retryAfter),
          });
        }
      }
      res = await fn({ req, log, requestId, params: await context.params });
    } catch (err) {
      res = errorResponse(err, log);
    }
    res.headers.set("x-request-id", requestId);
    if (opts.cors === "public") {
      res.headers.set("Access-Control-Allow-Origin", "*");
      res.headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    }
    log.info({ status: res.status, ms: Math.round(performance.now() - started) }, "request");
    return res;
  };
}

export function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  const allowed = new Set([siteUrl, req.nextUrl.origin]);
  if (!origin || !allowed.has(origin)) {
    throw new ApiError(403, "bad_origin", "Cross-origin request refused.");
  }
}

export async function parseJson<T extends z.ZodType>(req: NextRequest, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "The request body is not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, "invalid_input", z.prettifyError(parsed.error));
  }
  return parsed.data;
}

function errorResponse(err: unknown, log: Logger) {
  if (err instanceof ApiError) {
    if (err.status >= 500) log.error({ err }, err.message);
    else log.warn({ code: err.code, status: err.status }, err.message);
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status, headers: err.headers },
    );
  }
  log.error({ err }, "unhandled error");
  return NextResponse.json(
    { error: { code: "internal", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
