import type { Instrumentation } from "next";

/**
 * Error tracking and tracing (items 60–61). With SENTRY_DSN set, Sentry
 * traces requests, database calls (fetch) and queue jobs; it brings its own
 * OpenTelemetry setup. Without it, @vercel/otel registers OpenTelemetry so
 * Vercel's tracing (or any OTLP collector) receives the same spans. Every
 * unhandled server error is also written to the structured log with its
 * request id.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel({ serviceName: "jhts" });
    return;
  }
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logger } = await import("@/lib/log");
  const headers = request.headers as Record<string, string | string[] | undefined>;
  logger.error(
    {
      err,
      requestId: headers["x-request-id"],
      path: request.path,
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
    },
    "request error",
  );
  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureRequestError(err, request, context);
  }
};
