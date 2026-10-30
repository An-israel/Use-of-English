# Decisions log

Answers given before Milestone 1, plus changes to the brief's data model and why.

## Answers from the project owner (30 October 2026)

| Question                    | Decision                                                                                                                                                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository layout           | JHTS lives at the repository root.                                                                                                                                                                                                                                                                                            |
| First issue                 | Vol. 1 No. 1 is **March 2027**. Sample data: Volume 1 = 2027, Volume 2 = 2028.                                                                                                                                                                                                                                                |
| Reviewers                   | **Full in-site review.** A `reviewer` role is added. Editors invite and assign reviewers. Reviewers accept or decline, download the anonymised manuscript, submit a recommendation with comments (to the author, and confidential comments to the editor), and get due-date reminders. Reviewers never see author identities. |
| Book reviews                | Submitted through the same form and pay **both fees**.                                                                                                                                                                                                                                                                        |
| Fees switched off           | The "Awaiting review fee" step is skipped, and accepted papers go straight to "In production".                                                                                                                                                                                                                                |
| Editor-in-Chief affiliation | University of Nigeria, Nsukka.                                                                                                                                                                                                                                                                                                |
| Third-party services        | Free options only: Postgres-backed rate limiting (no Upstash), UptimeRobot free tier, Sentry free tier (optional), Cloudflare Turnstile, weekly backups to a Google Drive the Unit owns.                                                                                                                                      |
| Database region             | Supabase **London (eu-west-2)**; Vercel functions in `lhr1` to sit next to it.                                                                                                                                                                                                                                                |

## Corrections to cross-references in the brief

- Item 55 "previous file versions are kept (section 8)" refers to section 9.3.
- Item 61 "business metrics in section 9" refers to section 10.

## Changes to the data model (section 14)

- **Reviewer role and `review_assignments`**: these follow from the reviewers decision above. A `reviewer_submissions` view exposes only title, abstract, keywords and category, so the blind holds at the database level.
- **`pages` and `policies` share one table** with a `kind` column. Both have the same shape, editor, version history and slug redirects.
- **`jobs` table instead of pgmq**: claimed with `FOR UPDATE SKIP LOCKED` (item 37), with retries, backoff and a `dead_letter_jobs` table. It runs identically on Supabase, in local development and in the Docker self-hosting setup. pgmq can replace it later without changing producers.
- **Cron leases** (`cron_leases`, `acquire_lease`) instead of session advisory locks for cron jobs. Serverless functions talk to the database through PostgREST and a transaction pooler, where session-level advisory locks cannot be held across calls. A lease row does the same job safely. Transaction-scoped advisory locks are still used inside single database functions, such as issue publishing.
- **`metrics_events`** is partitioned monthly by `day` and de-duplicated by `(day, kind, target_key, format, session_hash)`. A `metrics_daily` roll-up keeps dashboards fast and allows raw events to be pruned.
- **Extra tables**: `submission_counters` (atomic `JHTS-YYYY-NNNN` IDs), `file_versions` (replaced published files are kept), `pending_uploads` (saga compensation for orphaned uploads), `rate_limit_buckets`.
- **`is_sample`** on volumes, issues and articles, so `npm run samples:delete` removes sample content precisely.
- **Author emails** on published articles are hidden from the public by column privileges. Only `article_author_emails()` returns them, and only to editors or when the author opted in.

## Design and platform notes

- **Demo mode**: with no Supabase keys, the public site renders from `src/content`, the same files that generate `supabase/seed.sql`. This lets the committee review the design from any preview link.
- **Content Security Policy**: public pages are statically generated, so per-request nonces are unavailable and inline scripts are allowed. XSS is handled by sanitising all rich text on save and on render; every other source is locked to named origins.
- **`/privacy`** permanently redirects to `/policies/privacy`, so the privacy text exists in one place.

## Milestone 4: accounts and roles

- **One role per person.** A Reviewer keeps everything an Author can do: they can submit their own work (migration 0900). Finance Officers still cannot submit, as the roles table in section 6 says.
- **Who invites whom.** Super Admins invite any role. Editors and Book Review Editors invite Reviewers only, and may turn an existing Author into a Reviewer. They cannot change any other role.
- **Roles live in two places, kept in step.** `profiles.role` drives RLS. The same role is stored in the auth user's `app_metadata.jhts_role`, which only the service role can write. A trigger (migration 1000) copies changes across, because Supabase writes custom app_metadata after the user row is created.
- **Email links go to `/auth/confirm`.** Branded templates in `supabase/templates` send a one-time token hash, which the server verifies and turns into a session cookie. This keeps sessions server-side (`@supabase/ssr`) and avoids tokens in URL fragments.
- **No account enumeration.** Sign-up and password reset show the same message whether or not an address is registered; sign-in failures never say which part was wrong.
- **Deactivation** sets `profiles.is_active = false` and bans the auth user, so existing sessions end at their next refresh. The database still refuses to remove the last active Super Admin.
- **The header** is statically generated, so it shows "My account" instead of "Sign in" by checking for the Supabase session cookie in the browser (no request).
