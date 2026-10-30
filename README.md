# JHTS: Journal of Humanities and Transcultural Studies

The website, submissions system, payments and admin dashboard for JHTS, published by the Use of English Unit, School of General Studies, University of Nigeria, Nsukka. Suggested domain: `jhts.unn.edu.ng`.

> **Status: Milestone 1 (foundation).** The full README, deployment guide and Editor's Handbook come with Milestone 10. Decisions so far are in [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Stack

Next.js 16 (App Router, Cache Components, TypeScript strict) · Supabase (Postgres, Auth, Storage, Realtime) · Tailwind CSS 4 with JHTS design tokens · Paystack · Resend · Vercel.

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev            # http://localhost:3000
```

With no Supabase keys in `.env.local`, the site runs in **demo mode** from the seed content in `src/content`, so you can review the design without a database.

### With a local Supabase

```bash
npx supabase start     # needs Docker; applies supabase/migrations and supabase/seed.sql
# copy the printed API URL, anon key and service-role key into .env.local
npm run db:test        # RLS tests (DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres)
npm run admin:create   # first Super Admin from SUPER_ADMIN_EMAIL
```

## Accounts and email (Supabase Auth)

In the Supabase dashboard for the live project:

1. **Authentication → URL configuration**: Site URL `https://jhts.unn.edu.ng`; add `https://jhts.unn.edu.ng/auth/callback` and `https://jhts.unn.edu.ng/auth/confirm` to the redirect URLs.
2. **Authentication → Email templates**: paste the four files from `supabase/templates` (confirm signup, invite, reset password, change email). Their links point at `/auth/confirm`.
3. **Authentication → SMTP**: use Resend's SMTP details so auth emails come from the journal's domain (DNS records are in the deployment guide).
4. **Authentication → Providers → Email**: keep "Confirm email" on; minimum password length 10.
5. Optional: enable Google under Providers, then switch on the `google_sign_in` feature flag.
6. Create the first Super Admin with `npm run admin:create`.

## Payments (Paystack)

1. In the Paystack dashboard (Settings → API keys and webhooks), copy the **test** keys into `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY`. The receipts and the admin show "TEST MODE" until live keys (`sk_live_…`) are used.
2. Set the webhook URL to `https://jhts.unn.edu.ng/api/webhooks/paystack`. The callback URL is set per payment by the site.
3. Without keys, set `PAYSTACK_MODE=mock` locally to use the simulated checkout. It is refused in production.
4. The job worker (receipts and emails) runs at `/api/cron/jobs`, protected by `CRON_SECRET`. Set the repository variable `SITE_URL` and the secret `CRON_SECRET` in GitHub so `.github/workflows/cron.yml` calls it every 10 minutes.

## Scripts

| Command                                 | What it does                                        |
| --------------------------------------- | --------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Develop, build, serve                               |
| `npm run lint` · `typecheck` · `format` | ESLint, TypeScript, Prettier                        |
| `npm test`                              | Unit tests (Vitest)                                 |
| `npm run test:e2e`                      | Playwright end-to-end tests                         |
| `npm run seed:generate`                 | Rebuild `supabase/seed.sql` from `src/content`      |
| `npm run samples:delete`                | Remove all SAMPLE issues and articles before launch |
| `npm run db:test`                       | Row Level Security tests against `DATABASE_URL`     |
| `npm run screenshots -- <url> <dir>`    | Design review screenshots at 390, 1024 and 1440 px  |

## Layout

```
src/app/(site)        public pages            src/content          seed content (single source of truth)
src/components/weave  <Weave /> <IssueCover/> src/lib/data         cached content reads (Supabase or demo)
src/components/site   header, footer, search  supabase/migrations  schema, RLS, storage policies
supabase/rollbacks    reversal for each migration                  supabase/tests  RLS tests
```

## Docker

`Dockerfile` builds a standalone production image; `docker-compose.yml` runs it against a local Supabase stack. Vercel deployments don't use them; they are there for development and in case UNN ICT ever self-hosts the site.
