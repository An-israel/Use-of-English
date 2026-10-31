# DNS records for the JHTS website

**For:** UNN ICT (whoever manages the `unn.edu.ng` DNS zone)
**From:** the JHTS editorial office, Use of English Unit, School of General Studies
**Domain:** `jhts.unn.edu.ng` [TO CONFIRM: the committee's chosen name]

The Journal of Humanities and Transcultural Studies (JHTS) website is hosted on Vercel, and its emails (submission receipts, payment receipts, reviewer invitations) are sent through Resend. We are asking for one subdomain and a few email records. Nothing else in `unn.edu.ng` changes, and no university server, mailbox or existing record is affected.

## What we need

Please create these records in the `unn.edu.ng` zone. Values shown as `<…>` are generated for our accounts; the editorial office will send the exact values from the Vercel and Resend dashboards when we are ready. A TTL of 3600 (1 hour) is fine for all of them.

### 1. The website

| Name (host)       | Type  | Value                  |
| ----------------- | ----- | ---------------------- |
| `jhts.unn.edu.ng` | CNAME | `cname.vercel-dns.com` |

If Vercel asks to confirm ownership of the domain, it will also show a TXT record:

| Name (host)          | Type | Value                  |
| -------------------- | ---- | ---------------------- |
| `_vercel.unn.edu.ng` | TXT  | `<vc-domain-verify=…>` |

Vercel issues and renews the HTTPS certificate automatically (through Let's Encrypt) once the CNAME resolves. **If `unn.edu.ng` has CAA records**, please make sure `letsencrypt.org` is allowed to issue, or the certificate can't be created:

| Name (host)       | Type | Value                       |
| ----------------- | ---- | --------------------------- |
| `jhts.unn.edu.ng` | CAA  | `0 issue "letsencrypt.org"` |

### 2. Sending email from the journal's address

So that emails from `editorial@jhts.unn.edu.ng` reach inboxes rather than spam folders. These records sit under `send.jhts.unn.edu.ng` and `jhts.unn.edu.ng` only; they don't affect the university's own email.

| Purpose | Name (host)                         | Type             | Value                                          |
| ------- | ----------------------------------- | ---------------- | ---------------------------------------------- |
| SPF     | `send.jhts.unn.edu.ng`              | TXT              | `v=spf1 include:amazonses.com ~all`            |
| Bounces | `send.jhts.unn.edu.ng`              | MX (priority 10) | `<feedback-smtp.….amazonses.com>`              |
| DKIM    | `resend._domainkey.jhts.unn.edu.ng` | TXT              | `<p=MIGfMA0… a long key from Resend>`          |
| DMARC   | `_dmarc.jhts.unn.edu.ng`            | TXT              | `v=DMARC1; p=none; rua=mailto:<journal email>` |

The DKIM value is long. Some DNS panels split long TXT values into several quoted strings automatically; that is correct and works.

After about a month of clean reports we may ask to tighten DMARC to `p=quarantine`.

## How to check

Once the records are in, anyone can check them (allow up to 24 hours to propagate, usually much less):

```bash
dig +short CNAME jhts.unn.edu.ng                    # cname.vercel-dns.com.
dig +short TXT send.jhts.unn.edu.ng                 # "v=spf1 include:amazonses.com ~all"
dig +short TXT resend._domainkey.jhts.unn.edu.ng    # "p=MIGfMA0…"
dig +short TXT _dmarc.jhts.unn.edu.ng               # "v=DMARC1; p=none; …"
```

Vercel's and Resend's dashboards also show each record as "Verified" once they can see it. We will confirm when everything is green.

## Please don't

- Point `jhts.unn.edu.ng` at a university web server or proxy it: the certificate and the site's security headers come from Vercel.
- Add an `A` record for `jhts.unn.edu.ng` as well as the CNAME (a name can't have both). If your DNS panel can't hold a CNAME here, tell us and we will send the `A` record value Vercel gives instead.

## Contacts

- Editorial office: [TO CONFIRM: name, email and phone]
- Technical contact (Super Admin): [TO CONFIRM: name and email]

Thank you. Once the records are live, the site will be at **https://jhts.unn.edu.ng**.
