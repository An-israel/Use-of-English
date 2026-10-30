import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { withTimeout } from "@/lib/resilience";

const DB_TIMEOUT_MS = 8_000;

/** fetch with an explicit timeout for every Supabase call (item 11). */
const timedFetch: typeof fetch = (input, init) =>
  withTimeout((signal) => fetch(input, { ...init, signal }), DB_TIMEOUT_MS, init?.signal ?? undefined);

function requirePublic() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  return { url, key };
}

/**
 * Anonymous client with no cookies: safe inside `use cache` scopes, sees only
 * what RLS allows the public to read.
 */
export function publicClient() {
  const { url, key } = requirePublic();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timedFetch },
  });
}

/** Per-request client acting as the signed-in user (RLS applies). */
export async function userClient() {
  const { url, key } = requirePublic();
  // Sessions are per request: never part of a prerendered shell (the auth
  // library reads the clock while loading the session).
  await connection();
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
    global: { fetch: timedFetch },
  });
}

/**
 * Service-role client. Bypasses RLS: use only in server code after checking
 * the caller's role (webhooks, cron, invitations, payment writes).
 */
export function adminClient() {
  const { url } = requirePublic();
  const key = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: timedFetch },
  });
}
