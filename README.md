# JHTS: Journal of Humanities and Transcultural Studies

The website, submissions system, payments and admin dashboard for JHTS, published by the Use of English Unit, School of General Studies, University of Nigeria, Nsukka. Suggested domain: `jhts.unn.edu.ng`.

> **Status: 1.0.0, ready to launch** once the committee confirms the items marked [TO CONFIRM] and the production accounts exist. Follow [`docs/LAUNCH.md`](docs/LAUNCH.md).

## Documents

| For                   | Read                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Editors and staff     | [Editor's Handbook](docs/EDITORS_HANDBOOK.md) (also in the admin under **Handbook**)                                                                                          |
| Going live            | [LAUNCH.md](docs/LAUNCH.md)                                                                                                                                                   |
| UNN ICT               | [DNS_FOR_UNN_ICT.md](docs/DNS_FOR_UNN_ICT.md)                                                                                                                                 |
| Whoever runs the site | [RUNBOOK.md](docs/RUNBOOK.md) and [POSTMORTEM_TEMPLATE.md](docs/POSTMORTEM_TEMPLATE.md)                                                                                       |
| Developers            | [ENGINEERING.md](docs/ENGINEERING.md) (all 111 engineering items), [DECISIONS.md](docs/DECISIONS.md), [DESIGN_REVIEW.md](docs/DESIGN_REVIEW.md), [CHANGELOG.md](CHANGELOG.md) |

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

## Environment variables

Copy `.env.example` to `.env.local` for development; in production set them in Vercel → Project → Settings → Environment Variables. Only `.env.example` is committed.

| Variable                                                    | What it is                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                      | The site's address, e.g. `https://jhts.unn.edu.ng`                            |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API                                             |
| `SUPABASE_SERVICE_ROLE_KEY`                                 | Same page. **Server only**: never in client code or a `NEXT_PUBLIC_` variable |
| `DATABASE_URL`                                              | Session-pooler connection string, for scripts (`samples:delete`, `db:test`)   |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY`    | Paystack test keys (`pk_test_`/`sk_test_`) until launch, then live keys       |
| `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`                   | Resend API key; signing secret of the bounce webhook                          |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`    | Cloudflare Turnstile (spam protection on the contact form and sign-up)        |
| `CRON_SECRET`                                               | 32+ random characters; scheduled jobs and the GitHub workflows send it        |
| `METRICS_SALT`                                              | 16+ random characters; salts the anonymous view and download counts           |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                      | Optional error tracking                                                       |
| `ALERT_EMAIL`                                               | Optional; alerts go to every Super Admin otherwise                            |
| `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME`                     | For `npm run admin:create`                                                    |

`npm run launch:check` checks the production values (live Paystack keys, https site address and so on) before launch.

## Accounts and email (Supabase Auth)

In the Supabase dashboard for the live project:

1. **Authentication → URL configuration**: Site URL `https://jhts.unn.edu.ng`; add `https://jhts.unn.edu.ng/auth/callback` and `https://jhts.unn.edu.ng/auth/confirm` to the redirect URLs.
2. **Authentication → Email templates**: paste the four files from `supabase/templates` (confirm signup, invite, reset password, change email). Their links point at `/auth/confirm`.
3. **Authentication → SMTP**: use Resend's SMTP details so auth emails come from the journal's domain (DNS records: [DNS_FOR_UNN_ICT.md](docs/DNS_FOR_UNN_ICT.md)).
4. **Authentication → Providers → Email**: keep "Confirm email" on; minimum password length 10.
5. Optional: enable Google under Providers, then switch on the `google_sign_in` feature flag.
6. Create the first Super Admin with `npm run admin:create` (with `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_NAME` and the Supabase URL and service role key set). They receive an invitation email to choose a password, then invite everyone else from Admin → Users.

## Email (Resend)

All other email (receipts, decisions, reviewer invitations and reminders) is sent through Resend from the address in Admin → Settings.

1. Resend → Domains → add `jhts.unn.edu.ng` and send the records it shows to UNN ICT ([DNS_FOR_UNN_ICT.md](docs/DNS_FOR_UNN_ICT.md)). Emails go out once the domain is verified.
2. Resend → API keys → create a sending key for `RESEND_API_KEY`.
3. Resend → Webhooks → `https://jhts.unn.edu.ng/api/webhooks/email` for `email.bounced` and `email.complained`; its signing secret is `RESEND_WEBHOOK_SECRET`. Addresses that bounce are not emailed again.

## Payments (Paystack)

1. In the Paystack dashboard (Settings → API keys and webhooks), copy the **test** keys into `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` and `PAYSTACK_SECRET_KEY`. The receipts and the admin show "TEST MODE" until live keys (`sk_live_…`) are used.
2. Set the webhook URL to `https://jhts.unn.edu.ng/api/webhooks/paystack`. The callback URL is set per payment by the site.
3. Without keys, set `PAYSTACK_MODE=mock` locally to use the simulated checkout. It is refused in production.
4. **Going live:** the Unit completes Paystack's business verification ("Go live" in the dashboard), then the live keys (`pk_live_…`, `sk_live_…`) replace the test keys in Vercel. The TEST MODE banner disappears. [LAUNCH.md](docs/LAUNCH.md) describes a ₦100 live test payment and refund.
5. Reconciliation runs daily at `/api/cron/reconcile` (yesterday in Lagos time; `?date=YYYY-MM-DD` for another day), from Vercel Cron and the GitHub workflow. Mismatches appear under Admin → Reconciliation and are emailed to the Finance Officers. Nothing is changed automatically.
6. Refunds are made in the Paystack dashboard, then recorded under Admin → Payments → the payment (amount, date, reason, Paystack refund reference).
7. The job worker (receipts and emails) runs at `/api/cron/jobs`, protected by `CRON_SECRET`. Set the repository variable `SITE_URL` and the secret `CRON_SECRET` in GitHub so `.github/workflows/cron.yml` calls it every 10 minutes.

## The editorial office (`/admin`)

Staff sign in and open `/admin`. Press Ctrl or ⌘ + K for quick actions; the sidebar collapses and the choice is remembered.

| Section                                | Who                                              | What                                                                                       |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Submissions                            | Editors (book reviews: BRE)                      | Table with saved filters, kanban board, reviewers, plagiarism data, decisions              |
| Issues                                 | Editors                                          | Create the next issue, editorial, cover, full-issue files, order, publish                  |
| Articles, In Press                     | Editors                                          | Details, authors, files with versions, full text, publish or schedule, bin                 |
| Book reviews                           | Editors, Book Review Editor                      | Book details and cover                                                                     |
| Journal                                | Editors                                          | Categories, Call for Papers, pages and policies (versioned), editorial board               |
| Messages                               | Editors                                          | Contact-form inbox                                                                         |
| Users and roles                        | Super Admin, editors                             | Invitations and roles                                                                      |
| Payments, Reconciliation, Fund summary | Finance Officer, Super Admin (editors view only) | Filters, totals by month and fee, CSV and PDF exports, refunds, mismatches, fund statement |
| Settings                               | Super Admin                                      | Journal details, ISSN, DOI prefix, fees, email sender, links, SEO, feature flags           |
| System, Audit log                      | Super Admin                                      | Service health, failed jobs, scheduled jobs, backups; every change on record               |
| Handbook                               | All staff                                        | The Editor's Handbook                                                                      |

Reviewers find their requests on `/account` and review at `/review/<id>`.

## Indexing and analytics

- `sitemap.xml`, `robots.txt` and `rss.xml` are generated from the published content. Submit the sitemap in Google Search Console.
- Google Scholar tags, Dublin Core and JSON-LD are on every article; Open Graph images are generated for the journal, issues and articles.
- Crossref: set the DOI prefix in Settings once JHTS is a member, then use "Assign DOIs" and "Crossref XML" on each issue and upload the file at Crossref. Nothing is sent automatically.
- OAI-PMH: switch on the `oai_pmh` flag in Settings; the base URL is `/api/oai`.
- Views and downloads appear under Admin → Analytics. Set `METRICS_SALT` (16+ random characters) in production.

## Deployment

Production runs on Vercel (Pro plan, region `lhr1`, London) with Supabase in London (eu-west-2).

1. Import the repository in Vercel; the framework is detected. Add the environment variables above for Production.
2. Apply the database schema to the production project: `npx supabase link --project-ref <ref>` then `npx supabase db push`. Later migrations go the same way, before the deploy that needs them; every migration has a tested rollback in `supabase/rollbacks`.
3. Every push to the main branch deploys; pull requests get preview deployments. CI (`.github/workflows/ci.yml`) runs lint, types, unit, database, rollback and end-to-end tests first.
4. Scheduled jobs are in `vercel.json` (Vercel Cron) with `.github/workflows/cron.yml` as a backup caller.
5. Add the domain in Vercel → Domains, and ask UNN ICT for the records in [DNS_FOR_UNN_ICT.md](docs/DNS_FOR_UNN_ICT.md). Vercel issues the HTTPS certificate.

The full go-live sequence, including deleting the SAMPLE content and a live test payment, is [LAUNCH.md](docs/LAUNCH.md).

## Operations

- `docs/ENGINEERING.md`: how each of the 111 engineering items is met, SLOs and measurements. `docs/RUNBOOK.md`: setup, backups, incidents and recovery. `docs/POSTMORTEM_TEMPLATE.md`: for incidents.
- Scheduled jobs: `/api/cron/jobs` (queue), `/api/cron/reconcile` and `/api/cron/daily` (reminders, clean-up, alerts), called by Vercel Cron or `.github/workflows/cron.yml` with `CRON_SECRET`. Weekly backups run in `.github/workflows/backup.yml`.
- GitHub secrets for the backup workflow: `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_PASSPHRASE`, `RCLONE_CONFIG` and `CRON_SECRET` (listed at the top of the workflow).
- Admin → System shows health, failed jobs, scheduled jobs and backups; Admin → Audit log shows every change. The public API is documented at `/api/v1`.

## Scripts

| Command                                 | What it does                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Develop, build, serve                                                                   |
| `npm run lint` · `typecheck` · `format` | ESLint, TypeScript, Prettier                                                            |
| `npm test`                              | Unit tests (Vitest)                                                                     |
| `npm run test:e2e`                      | Playwright end-to-end tests                                                             |
| `npm run seed:generate`                 | Rebuild `supabase/seed.sql` from `src/content`                                          |
| `npm run samples:delete`                | Remove all SAMPLE issues and articles (and their files) before launch, after confirming |
| `npm run admin:create`                  | Create or promote the first Super Admin                                                 |
| `npm run launch:check`                  | Check production settings and content before launch                                     |
| `npm run handbook:generate`             | Rebuild `docs/EDITORS_HANDBOOK.md` from `src/content/handbook.ts`                       |
| `npm run db:test`                       | Row Level Security tests against `DATABASE_URL`                                         |
| `npm run db:rollback-test`              | Apply every rollback, then every migration, in one transaction                          |
| `npm run db:restore-drill`              | Restore the latest backup into a scratch database                                       |
| `npm run screenshots -- <url> <dir>`    | Design review screenshots at 390, 1024 and 1440 px                                      |

## Layout

```
src/app/(site)        public pages            src/content          seed content (single source of truth)
src/components/weave  <Weave /> <IssueCover/> src/lib/data         cached content reads (Supabase or demo)
src/components/site   header, footer, search  supabase/migrations  schema, RLS, storage policies
supabase/rollbacks    reversal for each migration                  supabase/tests  RLS tests
```

## Docker

`Dockerfile` builds a standalone production image; `docker-compose.yml` runs it against a local Supabase stack. Vercel deployments don't use them; they are there for development and in case UNN ICT ever self-hosts the site.
