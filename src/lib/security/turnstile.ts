import "server-only";
import { serverEnv } from "@/lib/env.server";
import { withTimeout } from "@/lib/resilience";

/**
 * Verifies a Cloudflare Turnstile token. Only Cloudflare's fixed endpoint is
 * ever called (no user-supplied URLs, item 80). Without a secret configured
 * (local development) verification is skipped.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = serverEnv.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await withTimeout(
      (signal) => fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal }),
      5_000,
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
