# JHTS runbook

What to do when something needs attention, written for whoever is on duty. The engineering reasoning behind each piece is in [ENGINEERING.md](ENGINEERING.md).

- [On-call](#on-call)
- [First-time setup](#first-time-setup)
- [DNS](#dns)
- [Backups](#backups)
- [Disaster recovery](#disaster-recovery)
- [When a provider is down](#when-a-provider-is-down)
- [Incidents](#incidents)
- [Rotating keys](#rotating-keys)
- [Routine checks](#routine-checks)

## On-call

| Who                                                                  | Receives                                                                                 | Escalate to                                                     |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Super Admin (the `ALERT_EMAIL` address, or every active Super Admin) | Site down (UptimeRobot), error spikes (Sentry), failed jobs, backups, certificate expiry | The developer maintaining the site [TO CONFIRM: name and phone] |
| Finance Officer                                                      | Payment mismatches from reconciliation                                                   | Super Admin                                                     |
| The developer                                                        | Escalations                                                                              | UNN ICT for DNS and the domain [TO CONFIRM: contact]            |

Response targets: site down, acknowledge within 1 hour during office hours (09:00–16:00 WAT) and the next morning otherwise; everything else within one working day.

## First-time setup

Do these once when moving to production; each is needed for something in this runbook.

1. **Vercel**: Project → Settings → Environment Variables: every variable in `.env.example`. Firewall → enable the managed rule set and bot protection. Domains → add `jhts.unn.edu.ng` (see [DNS](#dns)).
2. **Supabase**: London region (eu-west-2), Pro plan (daily backups, no pausing). Auth → SMTP → Resend's SMTP so sign-up emails come from the journal. Auth → URL configuration → site URL `https://jhts.unn.edu.ng`. Database → note the session-pooler connection string (port 5432) for backups.
3. **GitHub** → Settings → Secrets and variables → Actions. Variables: `SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`. Secrets: `CRON_SECRET`, `SUPABASE_DB_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_PASSPHRASE`, `RCLONE_CONFIG`.
4. **Backups (rclone)**: on any computer run `rclone config` and create two remotes. `gdrive` is the journal's Google Drive. `supabase` is type S3, provider Other, with the endpoint, key and secret from Supabase → Storage → S3 connection. Paste the resulting `rclone.conf` into the `RCLONE_CONFIG` secret. Store `BACKUP_PASSPHRASE` offline as well, in the Unit's safe: without it, the backups can't be read.
5. **Paystack**: Settings → API keys and webhooks. Webhook URL `https://jhts.unn.edu.ng/api/webhooks/paystack`.
6. **Resend**: verify the sending domain ([DNS](#dns)); Webhooks → add `https://jhts.unn.edu.ng/api/webhooks/email` for `email.bounced` and `email.complained`, and put its signing secret in `RESEND_WEBHOOK_SECRET`.
7. **UptimeRobot** (free): two HTTP monitors every 5 minutes, `https://jhts.unn.edu.ng/` and `https://jhts.unn.edu.ng/api/health` (alert on any non-200), alerting the Super Admin email.
8. **Sentry** (free): create a Next.js project; set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`; Alerts → "number of errors > 20 in 5 minutes" to the Super Admin email.
9. **First Super Admin**: `npm run admin:create` with `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_NAME` set (plus the Supabase URL and service role key); the person receives an invitation to set their password (README).

## DNS

Records for UNN ICT to create (the values in angle brackets come from Vercel and Resend when the domain is added):

| Purpose                     | Name                                | Type  | Value                                                                                                  |
| --------------------------- | ----------------------------------- | ----- | ------------------------------------------------------------------------------------------------------ |
| The site                    | `jhts.unn.edu.ng`                   | CNAME | `cname.vercel-dns.com`                                                                                 |
| Vercel ownership (if asked) | `_vercel.unn.edu.ng`                | TXT   | `<vc-domain-verify=…>`                                                                                 |
| Email: SPF                  | `send.jhts.unn.edu.ng`              | TXT   | `v=spf1 include:amazonses.com ~all`                                                                    |
| Email: bounces              | `send.jhts.unn.edu.ng`              | MX 10 | `feedback-smtp.eu-west-1.amazonses.com`                                                                |
| Email: DKIM                 | `resend._domainkey.jhts.unn.edu.ng` | TXT   | `<p=MIGfMA0… from Resend>`                                                                             |
| Email: DMARC                | `_dmarc.jhts.unn.edu.ng`            | TXT   | `v=DMARC1; p=none; rua=mailto:<journal email>` (move to `p=quarantine` after a month of clean reports) |

Vercel issues and renews the HTTPS certificate once the CNAME resolves. If `jhts.unn.edu.ng` must be an apex record instead, use an A record to `76.76.21.21`. Allow up to 24 hours for DNS to propagate.

## Backups

| Copy                    | Where                                       | How often                 | Kept                                 |
| ----------------------- | ------------------------------------------- | ------------------------- | ------------------------------------ |
| Supabase backups        | Supabase (same provider)                    | Daily (Pro plan)          | 7 days                               |
| Off-site data and files | The journal's Google Drive, `JHTS-backups/` | Weekly (Sunday 03:13 WAT) | Until deleted; keep at least 8 weeks |

The weekly workflow (`.github/workflows/backup.yml`) writes `JHTS-backups/<date>/` with `data.sql.gz.gpg` (the data), `full.dump.gpg` (a complete dump) and `storage.json.gpg` (every file's path and size). It also mirrors every bucket to `JHTS-backups/storage/`. Each run reports to the site: Admin → System shows the last backup, and a failed or missing backup is emailed the next morning.

To run it by hand: GitHub → Actions → Weekly backup → Run workflow.

**Restore drill** (every quarter, and after any change to migrations or `scripts/backup.sh`), on a developer machine with the local stack running:

```bash
npm run db:restore-drill     # backup → rebuild from migrations → restore → compare row counts
```

The last drill passed on 30 October 2026 (17 tables, identical counts).

## Disaster recovery

Targets: **RPO 24 hours** (at most a day of changes lost), **RTO 4 hours** (the site back within four hours).

**A bad deployment** (pages broken after a release): Vercel → Deployments → the last good one → "Instant Rollback". This takes about 1 minute; the database is untouched.

**A bad migration**: apply its reversal from `supabase/rollbacks/<same name>.down.sql` in Supabase → SQL editor, then roll back the deployment. Every reversal is tested in CI (`npm run db:rollback-test`).

**Data deleted or corrupted** (for example a page or payment changed by mistake):

1. Check the audit log (Admin → Audit log) for the old values; small fixes can be made by hand from there.
2. For larger damage: Supabase → Database → Backups → restore the daily backup from before the incident (or point-in-time, if enabled). This replaces the whole database, so note anything entered since and re-enter it afterwards.

**The Supabase project is lost**, or the journal moves to a new one (about 2 hours):

1. Create a new Supabase project in London. In `supabase/config.toml` keep the settings; link it with `npx supabase link --project-ref <new ref>`.
2. Create the schema from git: `npx supabase db push` (all migrations).
3. Download the latest `JHTS-backups/<date>/data.sql.gz.gpg` from Google Drive and decrypt it: `gpg -d data.sql.gz.gpg > data.sql.gz`.
4. Load the data: `( echo "SET session_replication_role = replica;"; gunzip -c data.sql.gz ) | psql "<new session-pooler connection string>"`.
5. Restore the files: `for b in published finance covers submissions; do rclone copy gdrive:JHTS-backups/storage/$b newsupabase:$b; done`, with a `newsupabase` remote for the new project's S3 endpoint.
6. Update the Supabase URL and keys in Vercel and GitHub, redeploy, then sign in and check an article PDF, a receipt and the admin.
7. Tell staff they need to sign in again (sessions aren't backed up).

**Vercel is lost**: the Docker image (`Dockerfile`) runs the same app on any server; UNN ICT can host it with the same environment variables, and DNS points at that server instead.

## When a provider is down

| Down                           | Readers see                                                                                                               | Staff see                                                                                                                                                                | Do                                                                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase (database or Storage) | Cached pages keep working; search, sign-in, downloads and submissions fail with an error page. `/api/health` returns 503. | "The editorial office can't reach the database" with a retry button.                                                                                                     | Check status.supabase.com. Nothing to fix on our side; it recovers by itself. Supabase fails over or restarts the database automatically. |
| Vercel                         | The site may be unreachable in some regions                                                                               | Same                                                                                                                                                                     | Check vercel-status.com. If it's long, the Docker image can serve from UNN ICT (see above).                                               |
| Paystack                       | "The payment service is not responding. Please try again in a few minutes." when paying.                                  | Nothing else changes.                                                                                                                                                    | Check status.paystack.com. Payments made but not confirmed are caught by the nightly reconciliation.                                      |
| Resend (email)                 | Nothing visible.                                                                                                          | Emails wait in the queue and retry six times over about half an hour; after that they show under Admin → System → Failed jobs, and an alert is emailed the next morning. | When Resend is back, press Retry on each failed job.                                                                                      |
| Google Drive                   | Nothing.                                                                                                                  | The weekly backup fails and an alert is emailed.                                                                                                                         | Run the backup again from GitHub Actions once Drive is back.                                                                              |

## Incidents

For every incident: **detect** (the alert or report), **triage** (how many people are affected, is money or data at risk), **communicate** (tell the Editor-in-Chief; for anything over an hour, post a short note on the site's banner via Admin → Call for Papers or a page), **fix**, then **write it up** with [POSTMORTEM_TEMPLATE.md](POSTMORTEM_TEMPLATE.md) if it lasted over an hour or affected payments.

**Site down** (UptimeRobot alert)

1. Open `https://jhts.unn.edu.ng/api/health`. A 503 names the failing dependency (database or storage); see [When a provider is down](#when-a-provider-is-down).
2. If the health page itself doesn't load: Vercel → Deployments. Was there a deployment just before? Roll it back.
3. If the domain doesn't resolve: check the CNAME with UNN ICT ([DNS](#dns)).

**Uploads failing** (authors or editors report "The upload was interrupted")

1. Admin → System: is file storage OK?
2. Is the file over 20 MB (submissions) or 50 MB (articles), or not a PDF/Word file? The message says so; ask the person to export again.
3. Check Vercel logs for `requestUpload` or `commitAsset` errors around that time (search by the request id shown on the error).
4. Half-finished uploads are cleaned up automatically the next day.

**Emails not sending**

1. Admin → System → "Email in the last 24 hours": failed, bounced or suppressed?
2. _Failed_: check status.resend.com and that `RESEND_API_KEY` is set; then retry the failed jobs.
3. _Bounced_ or _suppressed_: the address doesn't accept mail. Ask the person for another address. To lift a suppression after they fix their mailbox, delete the address from `email_suppressions` in the Supabase table editor.
4. Many emails land in spam: check SPF, DKIM and DMARC ([DNS](#dns)) with Resend's domain page.

**Payments**

- _An author paid but the site shows unpaid_: Admin → Payments → the payment → **Check with Paystack**. If Paystack confirms the money, the payment is recorded and the receipt sent, exactly as the missed webhook would have done (it can't be applied twice). The nightly reconciliation lists any others as "Statuses differ".
- _Charged twice_: refund one in the Paystack dashboard, then record it on the payment (Admin → Payments → the payment → Record a refund).

**Wrong file published** (wrong PDF on an article or issue)

1. Admin → the article (or issue) → Files → Replace with the correct file. The public page shows the new file immediately; the wrong one is kept in "Previous versions" for the record.
2. If the wrong file contained something that must not be public (for example an unanonymised manuscript), also delete the old object in Supabase → Storage → `published`, and ask Google to drop the cached copy via Search Console → Removals.
3. If the article itself shouldn't be public: Unpublish, then fix, then publish again.

**Scheduled jobs not running** (System shows an old "Last finished")

1. GitHub → Actions → Scheduled jobs: are runs failing? Usually `CRON_SECRET` or `SITE_URL` is missing or wrong.
2. Run the queue by hand from Admin → System → "Process the queue now".

## Rotating keys

Rotate a key at once if it may have leaked, and at least yearly. After changing a value in Vercel, redeploy (Deployments → Redeploy) so functions pick it up.

| Key                       | Where to make a new one                              | Then update                                   | Notes                                                                                      |
| ------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Supabase JWT signing key  | Supabase → Project Settings → JWT keys → rotate      | nothing                                       | Signed-in users sign in again once.                                                        |
| Supabase anon key         | Supabase → API keys                                  | Vercel `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Public by design; rotate if the project is recreated.                                      |
| Supabase service role key | Supabase → API keys → roll the secret key            | Vercel and GitHub `SUPABASE_SERVICE_ROLE_KEY` | Server-only; treat a leak as an incident.                                                  |
| Database password         | Supabase → Database → reset password                 | GitHub `SUPABASE_DB_URL`                      | Used only by backups.                                                                      |
| Paystack secret key       | Paystack → Settings → API keys → generate new secret | Vercel `PAYSTACK_SECRET_KEY`                  | The webhook signature uses this key, so update promptly; Paystack retries failed webhooks. |
| Resend API key            | Resend → API keys → create, then revoke the old one  | Vercel `RESEND_API_KEY`                       | Supabase SMTP uses it too (Auth → SMTP).                                                   |
| Resend webhook secret     | Resend → Webhooks → the endpoint → rotate            | Vercel `RESEND_WEBHOOK_SECRET`                | Both secrets are accepted during the rotation window.                                      |
| Turnstile secret          | Cloudflare → Turnstile → the widget → rotate         | Vercel `TURNSTILE_SECRET_KEY`                 |                                                                                            |
| `CRON_SECRET`             | any 32+ random characters                            | Vercel and GitHub                             | Change both together.                                                                      |
| `METRICS_SALT`            | any 32+ random characters                            | Vercel                                        | Only affects de-duplication on the day it changes.                                         |
| `BACKUP_PASSPHRASE`       | any long passphrase                                  | GitHub, and the offline copy                  | Keep the old one for old backups.                                                          |
| Sentry DSN                | Sentry → the project → Client keys                   | Vercel `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |                                                                                            |
| Google sign-in client     | Google Cloud → Credentials                           | Supabase → Auth → Providers → Google          |                                                                                            |

## Routine checks

- **Weekly**: Admin → System. No failed jobs; the last backup is under a week old; no unexpected bounces. Admin → Reconciliation: nothing left to check.
- **Monthly**: UptimeRobot availability (target 99.5%); Vercel Speed Insights p95 (target under 2.5 s); merge Dependabot pull requests whose checks pass.
- **Quarterly**: run the restore drill; review who has staff roles (Admin → Users and roles) and deactivate people who have left.
- **Yearly**: rotate keys; re-run `scripts/explain.sql` and look for sequential scans on large tables; check the Supabase plan still fits (database size, Storage, egress). Upgrade compute (Supabase → Project Settings → Compute) if database CPU stays above 70%.
