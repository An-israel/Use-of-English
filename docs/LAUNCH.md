# Going live

The order to take JHTS from test to production. Each step says who does it. Setup details are in [RUNBOOK.md → First-time setup](RUNBOOK.md#first-time-setup); this page is the sequence and the checks.

## 1. Before launch day

| #   | Step                                                                                                                                                                                                                                                                  | Who                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | The committee answers every **[TO CONFIRM]** item (pages, policies, contact details, fees, the domain). `npm run launch:check` lists the ones still on the site.                                                                                                      | Committee             |
| 2   | Create the production **Supabase** project (London, Pro plan) and apply the schema: `npx supabase link --project-ref <ref>` then `npx supabase db push`.                                                                                                              | Developer             |
| 3   | Create the **Vercel** project (Pro plan, region `lhr1`), connect the repository, and add every variable in `.env.example` for Production.                                                                                                                             | Developer             |
| 4   | **Paystack → Go live.** The Unit (through the Bursary) completes Paystack's business verification so live keys are issued. Then copy the live keys (`sk_live_…`, `pk_live_…`) into Vercel and set the webhook URL to `https://jhts.unn.edu.ng/api/webhooks/paystack`. | Bursary, Super Admin  |
| 5   | **Resend**: add the domain `jhts.unn.edu.ng`, then send [DNS_FOR_UNN_ICT.md](DNS_FOR_UNN_ICT.md) to UNN ICT with the values Resend and Vercel show.                                                                                                                   | Super Admin → UNN ICT |
| 6   | Create the first Super Admin: `npm run admin:create` (README).                                                                                                                                                                                                        | Developer             |
| 7   | Set up backups, monitoring and error tracking (RUNBOOK steps 3, 4, 7 and 8). Run the backup workflow once by hand and check Admin → System shows it.                                                                                                                  | Developer             |

## 2. Launch day

1. **Confirm DNS** is live: `https://jhts.unn.edu.ng` loads with a valid certificate, and Resend shows the domain as verified.
2. **Delete the SAMPLE content** (with the production variables loaded, e.g. `vercel env pull .env.production.local`):

   ```bash
   npm run samples:delete
   ```

   It lists what it will remove (only rows marked SAMPLE and their files), asks you to type `delete samples`, then refreshes the site's pages. The site shows "The first issue is in preparation" until Vol. 1 No. 1 is published.

3. **Run the launch check** against production:

   ```bash
   npm run launch:check -- --env .env.production.local --site https://jhts.unn.edu.ng
   ```

   Every ✗ must be fixed before announcing the site. Items marked ! are worth reviewing but don't block launch.

4. **Make one real payment.** In Admin → Settings, set the review fee to ₦100 for a few minutes. Submit a test manuscript from a staff member's author account, pay with a real card, and check the receipt email, the payment in Admin → Payments and the next morning's reconciliation. Refund it in the Paystack dashboard, record the refund, withdraw the test submission, and set the fee back.
5. **Check the public site** with [PageSpeed Insights](https://pagespeed.web.dev/) on the home page, an issue and an article (target: 95 or more in every category on mobile), and submit `https://jhts.unn.edu.ng/sitemap.xml` in Google Search Console.
6. Delete `.env.production.local` from the computer used.

## 3. After launch

- **First week:** look at Admin → System daily (failed jobs, email bounces, backups) and at Sentry.
- **After a month of clean DMARC reports:** ask UNN ICT to change DMARC to `p=quarantine`.
- **When the ISSN and DOI prefix arrive:** add them in Admin → Settings (then "Assign DOIs" per issue; see the Editor's Handbook).
- **Every quarter:** the restore drill (RUNBOOK → Backups).
