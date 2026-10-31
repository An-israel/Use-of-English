# Changelog

All notable changes to the JHTS website. Versions follow [Semantic Versioning](https://semver.org/).

## [1.0.1] - Dependency updates and CI

- Updated React and React DOM to 19.3.1, Playwright to 1.64.1, and the GitHub Actions to checkout v7, setup-node v7, cache v6 and Supabase setup-cli v3 (all run on Node 24 now).
- Held back TypeScript 7, ESLint 10 and @types/node 26. TypeScript 7 breaks linting (typescript-eslint doesn't support it yet). The ESLint plugins in Next's config support ESLint 9 at most. Node's types follow the Node 22 runtime. Also held back @opentelemetry/api 1.10, which the OpenTelemetry packages used by @vercel/otel don't allow yet. Dependabot now skips these versions.
- `/issues/current` is now a plain HTTP redirect (307) instead of a redirect inside a streamed page, and it is no longer listed in the sitemap.
- The XML character filter (RSS, Crossref, OAI-PMH) is written with explicit escapes; its behaviour is unchanged.
- Local test runs can use an installed Chromium (`PLAYWRIGHT_CHROMIUM_PATH`).

## [1.0.0] - Milestone 10: Polish and launch

- Editor's Handbook: publishing an issue, handling a submission, waivers, refunds, payments and what to do when something goes wrong. It is in the admin (Handbook, for all staff) and in `docs/EDITORS_HANDBOOK.md`, generated from one source.
- Launch tooling:
  - `npm run launch:check` checks the production settings: live Paystack keys, https address, secrets, no SAMPLE content, a Super Admin, and any [TO CONFIRM] text left.
  - `npm run samples:delete` now also removes the samples' files, asks for confirmation and refreshes the live pages.
  - `docs/LAUNCH.md` gives the go-live order, including a ₦100 live payment test.
  - `docs/DNS_FOR_UNN_ICT.md` gives UNN ICT the DNS records and how to check them.
- Launch-day pages: with no issue published yet, the home page points to the Call for Papers, the archive says the first issue is in preparation, and subject pages say no articles yet, instead of showing empty filters.
- Accessibility: automated WCAG 2.2 AA scans of every public, author and admin page in light and dark mode, all passing.
  - Visible labels are now part of buttons' accessible names.
  - [TO CONFIRM] marks have stronger contrast.
  - The fees table can be scrolled with the keyboard.
  - The contact details are a valid definition list.
  - Heading order is fixed on Articles in Press.
- Performance (Lighthouse, mobile): public pages are 40–50% smaller and score 92–95 (simulated 4G) or 93–98 (applied throttling), with no layout shift.
  - Scroll reveals are CSS instead of JavaScript.
  - Weaves and cover lattices are cached SVG files.
  - The search index loads only when the palette opens.
  - Only Latin font files are preloaded.
  - Covers are rendered on the server.
- Security:
  - Every server action and API route validates its input with zod, and a test enforces that each action checks its input and its caller.
  - The admin page preview is sanitised.
  - Citation links are escaped.
  - `upgrade-insecure-requests` applies only when the site is on https.
- Fixes:
  - **Production build:** it failed whenever there were no issues or articles (it would have broken the first deploy after deleting the samples).
  - **Search:** robots.txt hid the author guidelines from search engines.
  - **First Super Admin:** `npm run admin:create` couldn't run.
  - **Stale content:** Supabase reads were held in an untagged 15-minute fetch cache that outlived publishing and builds.
  - **LCP:** a scroll-snap rail stopped Chrome measuring LCP on the home page.
  - **Favicon:** the site now has one.
- The brief's Framer Motion: its only use (scroll reveals) is now CSS, so the package was removed (see DECISIONS.md).
- Tests: accessibility scans, server-action and robots unit tests, handbook checks. 88 end-to-end, 285 unit and 38 database tests pass.

## [0.9.0] - Milestone 9: Reliability and operations

- System screen (Super Admin): database and storage health, queue size, failed jobs with retry and discard, scheduled jobs and their last result, off-site backups, email failures and suppressions, schema version. Audit log screen with filters.
- Notifications: a bell in the admin for new submissions, payments, failed payments, reviews, contact messages and reconciliation flags, shown to the roles that need them. Live through Supabase Realtime, with polling every minute as a fallback.
- Daily maintenance (`/api/cron/daily`): reminders to reviewers two days before a review is due and when overdue (once each), removal of uploads abandoned for over a day, expiry of untouched drafts, and alerts to the Super Admin about failed jobs, missing backups and the certificate's expiry date.
- Email: a signed Resend webhook records bounces and complaints and stops sending to those addresses.
- Backups: a weekly GitHub Actions workflow dumps the database and the file list, encrypts them and copies them to Google Drive and Supabase Storage, then reports to the System screen. Restore and rollback drills (`npm run db:restore-drill`, `npm run db:rollback-test`); every migration's rollback is tested in CI.
- Public read-only API at `/api/v1` (issues, categories, articles with filters and pages, one article by slug), CORS-open and versioned.
- Tracing with OpenTelemetry (Sentry when `SENTRY_DSN` is set), Vercel Analytics and Speed Insights on Vercel, retries for database deadlocks, and an admin screen that says plainly when the database can't be reached.
- Bulk PDF upload on the issue editor: drop several PDFs, each is matched to an article by name, three upload at a time.
- Finance: "Check with Paystack" re-verifies a pending payment on demand.
- Docs: `docs/ENGINEERING.md` (all 111 items, SLOs, measurements, costs), `docs/RUNBOOK.md` and `docs/POSTMORTEM_TEMPLATE.md`.
- Migration 1800: staff notifications, email suppressions, backup runs and the failed-payment event.
- Fixes: when the database was unreachable, the admin sent staff to the login page as if they were signed out.
- Tests: operations end-to-end tests, chaos tests for provider outages, webhook signature and concurrency unit tests, a query-count check, and 38 database checks.

## [0.8.0] - Milestone 8: Downloads, analytics and indexing

- Downloads: `/api/download/article/[id]` and `/api/download/issue/[id]` (PDF or Word) count the download, then redirect to the CDN under a clean name such as `JHTS_Vol1_No1_2027_Okafor.pdf`. Missing formats return 404 and their buttons stay hidden.
- Counting: one view or download per reader per article per day, keyed by a salted daily hash (no addresses or personal data stored); crawlers, link previews, scripts and headless browsers are not counted. Daily totals are rolled up by the scheduled job, which also keeps next months' partitions ready.
- In-page PDF reader (pdf.js): pages render as they come into view, with zoom, page jump, full screen and selectable text; pdf.js loads only when the reader is near.
- Analytics: views and downloads over 30 days, 90 days or 12 months (one count axis, views as a line and downloads as columns, crosshair tooltip, keyboard access, table view), most-read articles, submissions by status, acceptance rate, days to decision, and payments for finance staff.
- Indexing: sitemap.xml, robots.txt, RSS, generated Open Graph images for the journal, issues and articles (Fraunces and Instrument Sans), Crossref 5.3.1 deposit XML per issue with DOIs suggested from the Settings prefix (export only), and an OAI-PMH 2.0 endpoint with Dublin Core behind the `oai_pmh` flag.
- Fixes: saving Settings failed whenever a field (ISSN, DOI prefix) was empty; the reader would have rendered only its first two pages.
- Tests: indexing end-to-end tests (upload, reader, counted downloads, views, analytics, sitemap, RSS, OG images, Crossref, OAI-PMH), unit tests for file names, bot filtering, analytics series, Crossref XML and every OAI-PMH verb and error.

## [0.7.0] - Milestone 7: Finance

- Payments: every payment, waiver and refund with filters for date range (Lagos time), fee type, status and issue; totals overall, by month and by fee type; a card list on phones.
- Exports: the filtered ledger as CSV (UTF-8, Excel-safe, protected against spreadsheet formula injection) and as a landscape PDF report; the fund statement as PDF and CSV. Finance Officer and Super Admin only, rate-limited and written to the audit log.
- Refunds: recorded against a payment (amount, date, reason, Paystack refund reference), never more than was paid; a full refund marks the payment refunded.
- Reconciliation: a daily job compares the day's Paystack transactions with the journal's records and flags money missing on either side, different amounts and missed webhooks. Flags are emailed to finance staff and resolved with a note; any day can be re-checked, idempotently.
- Fund summary: collected, refunds and net, by year and by fee.
- Migration 1700: the payments ledger view, refund events, and a fix that let refunds update the payment's status under RLS.
- Tests: finance end-to-end tests (exports, refunds, reconciliation, role limits), seven more database checks (34), unit tests for totals, CSV and reconciliation rules.

## [0.6.0] - Milestone 6: Admin dashboard

- Admin shell: collapsible sidebar, breadcrumbs, Ctrl/⌘ + K quick actions, confirmation dialogs, toasts, unsaved-change warnings, edit-conflict messages, loading skeletons, dark mode and a TEST MODE banner.
- Overview: stat tiles (open submissions, acceptance rate, days to decision, fees), "needs attention" and recent activity.
- Submissions: search, type and subject filters, saved filters, a kanban board by status; detail page with reviewer invitations, overdue flags, cancel and extend, reviews with confidential comments, anonymous sharing of comments with the author, similarity percentage and plagiarism report, received and accepted dates, handling editor, and "Create article from submission".
- Reviewers: `/review/<id>` to accept or decline, download the anonymised manuscript, recommend, comment and upload a report. Invitation and review-received emails.
- Issues: by year and volume, create the next quarterly issue in one click, editorial (rich text), uploaded or generated cover, full-issue files, contents order, publish, schedule, unpublish, preview, bin and restore.
- Articles and Articles in Press: create, details, authors in order, PDF and DOCX with version history, full text with Word clean-up, move into an issue, publish, schedule, unpublish, preview, bin and restore. Book reviews with book details and cover.
- Categories (order, thread colour, archive), Call for Papers, pages and policies with live preview and version history, editorial board (groups, order, photos, terms), contact inbox, settings and feature flags.
- Migrations 1500 (editorial workflow functions) and 1600 (saved filters, reordering, In Press assignment, version rules, page history fix). Scheduled publishing runs with the job cron.
- Fixes: a 404 inside the site showed the header and footer twice; page saves failed on the history trigger; saving authors caused a false edit conflict.
- Tests: admin and reviewer end-to-end tests, more database checks (27), and unit tests for the Word clean-up, HTML-mode detection and list helpers.

## [0.5.0] - Milestone 5: Submissions and payments

- Five-step submission form: details (live word count, keyword chips), authors (add, reorder by drag or arrows, corresponding author), files (direct, signed uploads to Storage; type and 20 MB checks), declarations, review and submit. Drafts autosave server-side; creation is idempotent.
- Paystack review and publication fees: server-side initialisation, signed and re-verified webhooks applied idempotently in one transaction, a status page that polls, retries after failure, and stale pending payments expired.
- Receipt PDFs (stored privately) and branded emails (submission received, receipt, status changes, contact form), all through the job queue with retries and an email log.
- Author submission page: timeline, history and messages, fee payment, receipts, files, revised-manuscript upload, withdrawal, and the acceptance letter PDF once the publication fee is paid or waived.
- Editors: a first submissions list and detail page with workflow-checked status changes (optimistic locking), messages and internal notes, and fee waivers with a recorded reason.
- Migrations 1100 to 1400. A mock Paystack checkout for development and tests (refused in production).
- End-to-end tests: submit and pay, idempotent and signed webhooks, acceptance and publication fee with the letter, failed payment then waiver.

## [0.4.0] - Milestone 4: Accounts and roles

- Registration with email confirmation, sign-in, password reset and email change; optional Google sign-in behind a feature flag.
- Branded Supabase Auth email templates; links verified server-side at `/auth/confirm`.
- Rate limits on sign-in, sign-up and password reset; no account enumeration; safe post-login redirects.
- Author dashboard (`/account`): submissions with a status timeline, reviewer assignments, profile (name, affiliation, ORCID) and security.
- Invitations: Super Admins invite any role; editors invite reviewers. Role changes and deactivation with an audit trail; the last Super Admin is protected.
- Admin shell (`/admin`) with role-gated navigation; Users and roles page.
- Migrations 0900 (reviewers may submit) and 1000 (keep profile roles in step with auth app_metadata).
- End-to-end tests for every account flow against a real Supabase stack, using captured emails.
- Fix: the woven pattern on solid-coloured panels could fail to paint in Chrome when animated.

## [0.3.0] - Milestone 3: Public site

- All Issues archive grouped by year and volume, with a year and subject filter and a sticky year index.
- Articles in Press, Book Reviews, Browse by Subject and subject pages (filter by type and year).
- Search page and Postgres search function: weighted full-text search, highlighted matches, typo tolerance, filters by year, issue, subject, type and author, pagination.
- About, Aims and Scope, The Use of English Unit, Call for Papers (with countdown), Author Guidelines, Fees and Payment, Policies index and pages.
- Contact form saved to the database, with validation, honeypot, Cloudflare Turnstile and rate limiting.
- End-to-end tests for every public page, search and the contact form.

## [0.2.0] - Milestone 2: Design checkpoint

- Full home page: current issue feature, Articles in Press rail, subject tiles, most read, book reviews, why publish, Call for Papers countdown, editorial board strip.
- Issue pages with editorial, table of contents grouped by type, abstract disclosures and previous/next issue; `/issues/current`.
- Article pages: author block with affiliations, ORCID and corresponding author; metadata; abstract and keywords; Cite panel (APA 7th, MLA 9th, Chicago, BibTeX, .ris/.bib); share; counts; full text with table of contents, side notes and reading-comfort controls; related articles; Google Scholar, Dublin Core and JSON-LD metadata.
- Editorial Board page with the Editor-in-Chief featured and consultants in their own band.
- Citation and sanitiser unit tests; WCAG contrast check script; design self-review in docs/DESIGN_REVIEW.md.

## [0.1.0] - Milestone 1: Foundation

- Next.js 16 app with the JHTS design tokens, self-hosted Fraunces, Literata and Instrument Sans, and light and dark themes.
- `<Weave />` lattice and generated `<IssueCover />` components.
- Header with mega-menus, Cmd/Ctrl + K search palette, mobile full-screen menu; footer with weave band.
- Supabase migrations: content, submissions, in-site peer review (Reviewer role), payments, operations, RLS and storage policies; RLS smoke tests.
- Seed generator for categories, editorial board, pages and policies, settings and SAMPLE issues.
- Health, liveness and readiness endpoints; structured logging; optional Sentry; security headers.
- CI, Dockerfile and docker-compose, Dependabot.
