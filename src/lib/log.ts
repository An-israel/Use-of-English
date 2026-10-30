import "server-only";
import pino from "pino";

/**
 * Structured JSON logs (item 59). Every line from a request carries its
 * request id. Secrets, tokens and file contents are never logged: the redact
 * list removes them even if a caller passes them by mistake.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  base: { service: "jhts", env: process.env.VERCEL_ENV ?? process.env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: { level: (label) => ({ level: label }) },
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "authorization",
      "*.authorization",
      "headers.authorization",
      "headers.cookie",
      "cookie",
      "*.secret",
      "secret",
      "*.apiKey",
      "body.file",
      "*.access_token",
      "*.refresh_token",
    ],
    censor: "[redacted]",
  },
});

export function requestLogger(requestId: string, extra: Record<string, unknown> = {}) {
  return logger.child({ requestId, ...extra });
}

export type Logger = typeof logger;
