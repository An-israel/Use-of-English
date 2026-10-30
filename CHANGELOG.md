# Changelog

All notable changes to the JHTS website. Versions follow [Semantic Versioning](https://semver.org/).

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
