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

## Milestone 5: submissions and payments

- **The database decides whether a fee is due.** `submit_submission()` reads the fee setting and flag itself; an author calling it directly cannot skip the review fee. Book reviews pay both fees, as agreed.
- **One transaction applies a payment.** `apply_payment_success()` locks the payment row, checks reference, amount and currency, marks it paid, issues the receipt number, advances the submission and records a `payment.succeeded` event, all at once. A repeat webhook returns `duplicate` and changes nothing. An amount mismatch is recorded as a reconciliation flag, not applied.
- **References** are `JHTS-RF-2027-0042-1` (review) and `JHTS-PF-2027-0042-1` (publication); the last number is the attempt. Starting a new attempt abandons earlier pending ones; a cron job abandons pending payments older than two hours.
- **Waivers** create a ₦0 `waived` payment with the reason and the editor, plus an internal note, so the trail stays complete.
- **Mock checkout.** Until the Unit's Paystack test keys exist, `PAYSTACK_MODE=mock` replaces Paystack Checkout with a clearly labelled local page that sends correctly signed webhooks. It is refused when `VERCEL_ENV=production`. Switching to real test keys needs no code change.
- **Files go straight to Storage** through signed upload URLs issued after the type and size are checked; the server then confirms the object exists before recording it. Paths carry the submission ID, never the author's identity.
- **Receipts and emails go through the job queue**, so a slow email provider never delays a payment. The queue is nudged right after payments and editor actions, runs every 10 minutes from GitHub Actions (Vercel's free plan allows cron only daily) and daily from Vercel Cron as a backstop.
- **Every email is logged** in `email_outbox`. Without `RESEND_API_KEY` they are logged instead of sent, which is how development and tests run.
- **PDF receipts use "NGN 5,000"**: the built-in PDF fonts have no naira sign. Web pages and emails use ₦.
- **Co-author lists lock on submission** (migration 1300), and authors may delete only their own unsent drafts.

## Milestone 6: the admin dashboard

- **Reviewers review on the site** (owner's choice). Editors invite from the reviewer pool (expertise and current load shown); the reviewer accepts or declines, downloads the anonymised manuscript under a neutral file name, recommends, writes comments for the author and confidential comments for the editors, and may upload a report. Editors share a reviewer's comments with the author anonymously ("Reviewer 1 comments") or upload a comments file the author can download. Invitations and submitted reviews are emailed through the queue.
- **Articles in Press may wait for an issue.** An online article can be assigned to a forthcoming issue and stays online as In Press until that issue is published; `publish_issue()` then moves it in. Publishing an article into an unpublished issue puts it online as In Press rather than taking it offline. (Migration 1600 drops the 0200 rule that an In Press article has no issue.)
- **Publishing happens in the database** (`publish_issue`, `publish_article`, `publish_due`), under an advisory lock, and emits domain events. Scheduled items are published by the cron route, which also refreshes the public caches.
- **Optimistic locking counts editors' changes only.** View and download counters and the search index (refreshed when authors are saved) no longer bump an article's version, so saving the authors and then the full text is not a false conflict. Forms that edit the same row on one page share its version, updated straight from each save, so a quick second save is never a false conflict. A real conflict keeps the form open with a "Reload now" button.
- **Rich text**: Tiptap for editorials, full texts, pages and the Call for Papers. Pasting from Word is cleaned in the browser and everything is sanitised again on the server. Text the visual editor can't represent (tables, footnotes, sidenotes, [TO CONFIRM] marks) opens in an HTML mode so nothing is lost.
- **Pages keep every version**; restoring one keeps the text it replaces. The snapshot trigger now runs with the definer's rights (editors may read history but not write it directly).
- **Soft deletes**: articles, issues (empty, unpublished only) and board members go to a bin and can be restored; categories are archived.
- **Saved filters** are stored per staff member in the database (private by RLS), so they follow the person across browsers.
- **Settings** (Super Admin) edit the same keys the public site reads; fee changes take effect for new payments and the database's `fees_enabled()` reads the same setting. Changes expire the public caches immediately (`updateTag`).
- **A missing article streams a 404 page with status 200** because the page shell is already sent (partial prerendering); Next adds `noindex`, so search engines don't index it.

## Milestone 7: finance

- **Who sees what** follows the brief's role table: the Finance Officer and Super Admins view, export, record refunds and resolve reconciliation flags; Editors view only; Book Review Editors and authors see no finance screens. The `payment_ledger` view checks the role itself, so finance staff also see which issue a paid article went into.
- **Dates are Lagos calendar days.** Date filters, months and years, the reconciliation day and the fund statement all use Africa/Lagos, so a payment at 00:30 on 1 April counts in April.
- **Totals are computed from the filtered ledger** (up to 10,000 rows, far beyond a quarterly journal's volume). The PDF lists up to 400 rows and says so when there are more; the CSV always has every row.
- **Refunds count in the year they are made** on the fund statement, and against the payment on the payments screens, so each view adds up.
- **Reconciliation never changes money.** It compares the day's Paystack transactions (by Paystack's creation time) with payments marked paid that day, and records four kinds of mismatch. Re-running a day only adds new flags. In mock mode "Paystack" is the record the simulated checkout leaves on each payment.
- **Exports are audited** (who, which filters, how many rows) and limited to 30 per 10 minutes per person.
- **No honorarium calculations**, as the brief says.

## Milestone 8: downloads, analytics and indexing

- **Files are served from the CDN, not through the app.** The download routes count, then redirect to the public Storage URL with a clean file name, so large PDFs never pass through a serverless function (item 41). Published files are public by design (open access); submissions and finance files stay private and signed.
- **Counting is privacy-first.** The reader is a SHA-256 of a secret salt, the Lagos date, address and browser; it changes every day and can't be reversed, so no personal data is stored. The database's unique key makes counting idempotent. Headless browsers are deliberately not counted, so automated tests send a normal browser user agent.
- **Views are counted by a small request from the article page**, because public pages are cached and pre-rendered; the server still checks the article is public. Counts shown on article pages refresh with the page cache (at most hourly), so reading never invalidates editors' caches.
- **Chart colours were validated** with the dataviz checks (lightness band, chroma, colour-blind separation, contrast) in light and dark. Views and downloads also differ by mark shape (line and columns), with a legend, an end label and a table view, so colour is never the only cue.
- **Crossref is export-only** until JHTS is a member: DOIs follow `prefix/jhts.YEAR.VOL.ISSUE.NN` in contents order; "Assign DOIs" writes them to articles that lack one.
- **OAI-PMH** offers `oai_dc` only, no sets, day granularity and resumption tokens of 100 records; it returns 404 while the flag is off.
- **Open Graph images** use the OFL-licensed Fraunces and Instrument Sans files in `assets/fonts` (licences included), read from disk as the Next.js documentation shows.
