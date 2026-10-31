/**
 * Pre-launch checklist (brief Milestone 10). Run it with the production
 * environment loaded, e.g. `vercel env pull .env.production.local` and then
 *
 *   npm run launch:check -- --env .env.production.local
 *   npm run launch:check -- --env .env.production.local --site https://jhts.unn.edu.ng
 *
 * It reads settings and content with the service role, and (with --site)
 * probes the live site. Nothing is changed. Exits 1 if anything blocks launch.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Level = "ok" | "warn" | "fail";
const results: { level: Level; text: string }[] = [];
const check = (level: Level, text: string) => results.push({ level, text });
const pass = (cond: boolean, text: string, failText = text, level: Level = "fail") =>
  check(cond ? "ok" : level, cond ? text : failText);

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};

// Load an env file without overriding variables already set.
const envFile = arg("--env");
if (envFile) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
const env = (k: string) => (process.env[k] ?? "").trim();

// --- Environment -----------------------------------------------------------
const site = env("NEXT_PUBLIC_SITE_URL");
pass(
  /^https:\/\//.test(site) && !/localhost|127\.0\.0\.1/.test(site),
  `Site URL is ${site}`,
  `NEXT_PUBLIC_SITE_URL must be the https address of the live site (is "${site || "unset"}")`,
);
if (/vercel\.app/.test(site))
  check("warn", "Site URL is a vercel.app address; switch it to the journal's domain once DNS is live");

const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL");
pass(
  /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(supabaseUrl),
  "Supabase URL points at a hosted project",
  "NEXT_PUBLIC_SUPABASE_URL is not a hosted Supabase project",
);
pass(
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY").length > 20,
  "Supabase anon key is set",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing",
);
pass(
  env("SUPABASE_SERVICE_ROLE_KEY").length > 20,
  "Supabase service role key is set (server only)",
  "SUPABASE_SERVICE_ROLE_KEY is missing",
);

pass(
  env("PAYSTACK_SECRET_KEY").startsWith("sk_live_"),
  "Paystack secret key is a live key",
  "PAYSTACK_SECRET_KEY is not a live key (sk_live_…): payments would stay in test mode",
);
pass(
  env("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY").startsWith("pk_live_"),
  "Paystack public key is a live key",
  "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not a live key (pk_live_…)",
);
pass(env("PAYSTACK_MODE") !== "mock", "Paystack simulator is off", "PAYSTACK_MODE=mock must not be set in production");

pass(env("RESEND_API_KEY").startsWith("re_"), "Resend API key is set", "RESEND_API_KEY is missing");
pass(
  env("RESEND_WEBHOOK_SECRET").startsWith("whsec_"),
  "Resend webhook secret is set",
  "RESEND_WEBHOOK_SECRET is missing: bounces won't be recorded",
  "warn",
);
pass(
  !!env("NEXT_PUBLIC_TURNSTILE_SITE_KEY") && !!env("TURNSTILE_SECRET_KEY"),
  "Turnstile keys are set",
  "Turnstile keys are missing: the contact form and sign-up have no spam protection",
);
pass(
  env("CRON_SECRET").length >= 32,
  "Cron secret is long enough",
  "CRON_SECRET must be at least 32 random characters",
);
pass(env("METRICS_SALT").length >= 16, "Metrics salt is set", "METRICS_SALT must be at least 16 random characters");
pass(
  !!env("SENTRY_DSN"),
  "Error tracking (Sentry) is set",
  "SENTRY_DSN is not set: errors go to logs and traces only",
  "warn",
);
pass(!!env("ALERT_EMAIL"), "Alert email is set", "ALERT_EMAIL is not set: alerts go to every Super Admin", "warn");

// --- Database ----------------------------------------------------------------
if (supabaseUrl && env("SUPABASE_SERVICE_ROLE_KEY")) {
  const db = createClient(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const [samples, admins, settings, pages, board] = await Promise.all([
    db.from("articles").select("id", { count: "exact", head: true }).eq("is_sample", true),
    db.from("profiles").select("email").eq("role", "super_admin").eq("is_active", true),
    db.from("site_settings").select("key, value"),
    db.from("pages").select("slug, title, body_html").is("deleted_at", null),
    db.from("editorial_board_members").select("name, affiliation, bio"),
  ]);
  if (samples.error) {
    check("fail", `Couldn't read the database: ${samples.error.message}`);
  } else {
    const allowSamples = process.argv.includes("--allow-samples");
    pass(
      (samples.count ?? 0) === 0,
      "No SAMPLE content left",
      `${samples.count} SAMPLE articles remain: run npm run samples:delete`,
      allowSamples ? "warn" : "fail",
    );
    pass(
      (admins.data?.length ?? 0) > 0,
      `Super Admin: ${admins.data?.length} active (${admins.data
        ?.slice(0, 3)
        .map((a) => a.email)
        .join(", ")}${(admins.data?.length ?? 0) > 3 ? ", …" : ""})`,
      "No active Super Admin: run npm run admin:create",
    );

    const s = Object.fromEntries((settings.data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
    const placeholder = (v: unknown) => typeof v === "string" && /\[(TO CONFIRM|JHTS_[A-Z_]+)\]/.test(v);
    const contact = s.contactEmail;
    pass(
      typeof contact === "string" && /@/.test(contact) && !placeholder(contact),
      `Contact email is ${contact}`,
      "Settings → contact email is still a placeholder",
    );
    pass(!!s.issn, `ISSN is ${s.issn}`, "Settings → ISSN is empty (fine until it is assigned)", "warn");
    const pending = [
      ...Object.entries(s)
        .filter(([, v]) => JSON.stringify(v).includes("TO CONFIRM"))
        .map(([k]) => `setting “${k}”`),
      ...(pages.data ?? []).filter((p) => (p.body_html ?? "").includes("TO CONFIRM")).map((p) => `page “${p.title}”`),
      ...(board.data ?? [])
        .filter((b) => JSON.stringify(b).includes("TO CONFIRM"))
        .map((b) => `board member “${b.name}”`),
    ];
    pass(
      pending.length === 0,
      "No [TO CONFIRM] text left",
      `[TO CONFIRM] text remains in ${pending.length} places: ${pending.join(", ")}`,
      "warn",
    );
  }
}

// --- Live site ---------------------------------------------------------------
const live = arg("--site");
if (live) {
  try {
    const health = await fetch(`${live}/api/health`);
    pass(health.ok, "Health check passes", `/api/health returned ${health.status}`);
    const home = await fetch(live);
    const h = home.headers;
    pass(
      (h.get("strict-transport-security") ?? "").includes("max-age"),
      "HSTS is on",
      "Strict-Transport-Security header is missing",
    );
    pass(
      (h.get("content-security-policy") ?? "").includes("default-src"),
      "Content Security Policy is on",
      "Content-Security-Policy header is missing",
    );
    const robots = await (await fetch(`${live}/robots.txt`)).text();
    pass(
      robots.includes(`Sitemap: ${live}`),
      "robots.txt points at this site's sitemap",
      "robots.txt points at a different address: check NEXT_PUBLIC_SITE_URL",
    );
  } catch (e) {
    check("fail", `Couldn't reach ${live}: ${(e as Error).message}`);
  }
}

// --- Report ------------------------------------------------------------------
const mark = { ok: "✓", warn: "!", fail: "✗" } as const;
for (const r of results) console.log(`${mark[r.level]} ${r.text}`);
const fails = results.filter((r) => r.level === "fail").length;
const warns = results.filter((r) => r.level === "warn").length;
console.log(`\n${fails ? `${fails} to fix before launch` : "Ready to launch"}${warns ? `, ${warns} to review` : ""}.`);
process.exit(fails ? 1 : 0);
