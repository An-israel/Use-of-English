# DNS records for the JHTCS website

**For:** whoever manages DNS for `jhtcs.org` (the registrar's DNS panel, or the DNS host it points to)
**From:** the JHTCS editorial office, Use of English Unit, School of General Studies
**Domain:** `jhtcs.org`, with the site at **https://www.jhtcs.org**

The Journal of Humanities and Transcultural Studies (JHTCS) website is hosted on Vercel, and its emails (submission receipts, payment receipts, reviewer invitations) are sent through Resend. Values shown as `<…>` are generated for our accounts; copy the exact values from the Vercel and Resend dashboards. A TTL of 3600 (1 hour) is fine for all of them.

## 1. The website

| Name (host)       | Type  | Value                  |
| ----------------- | ----- | ---------------------- |
| `www.jhtcs.org`   | CNAME | `cname.vercel-dns.com` |
| `jhtcs.org` (`@`) | A     | `76.76.21.21`          |

In Vercel → Project → Settings → Domains, add both `www.jhtcs.org` and `jhtcs.org`, and set `jhtcs.org` to redirect to `www.jhtcs.org`, so every visitor ends up on one address. If Vercel asks to confirm ownership, it also shows a TXT record (`_vercel.jhtcs.org`, `<vc-domain-verify=…>`).

Vercel issues and renews the HTTPS certificate automatically (through Let's Encrypt) once the records resolve. If the domain has CAA records, make sure `letsencrypt.org` is allowed to issue:

| Name (host)       | Type | Value                       |
| ----------------- | ---- | --------------------------- |
| `jhtcs.org` (`@`) | CAA  | `0 issue "letsencrypt.org"` |

## 2. Sending email from the journal's address

So that emails from `editorial@jhtcs.org` reach inboxes rather than spam folders. Add the domain `jhtcs.org` in Resend → Domains; it shows these records:

| Purpose | Name (host)                   | Type             | Value                                          |
| ------- | ----------------------------- | ---------------- | ---------------------------------------------- |
| SPF     | `send.jhtcs.org`              | TXT              | `v=spf1 include:amazonses.com ~all`            |
| Bounces | `send.jhtcs.org`              | MX (priority 10) | `<feedback-smtp.….amazonses.com>`              |
| DKIM    | `resend._domainkey.jhtcs.org` | TXT              | `<p=MIGfMA0… a long key from Resend>`          |
| DMARC   | `_dmarc.jhtcs.org`            | TXT              | `v=DMARC1; p=none; rua=mailto:<journal email>` |

The DKIM value is long. Some DNS panels split long TXT values into several quoted strings automatically; that is correct and works. After about a month of clean DMARC reports, tighten DMARC to `p=quarantine`.

Receiving mail at `editorial@jhtcs.org` (an inbox people read) needs the mail provider's own MX records on `jhtcs.org`; those are separate from the records above and don't conflict with them.

## How to check

Allow up to 24 hours to propagate, usually much less:

```bash
dig +short A jhtcs.org                          # 76.76.21.21
dig +short CNAME www.jhtcs.org                  # cname.vercel-dns.com.
dig +short TXT send.jhtcs.org                   # "v=spf1 include:amazonses.com ~all"
dig +short TXT resend._domainkey.jhtcs.org      # "p=MIGfMA0…"
dig +short TXT _dmarc.jhtcs.org                 # "v=DMARC1; p=none; …"
```

Vercel's and Resend's dashboards also show each record as "Verified" once they can see it.

## Please don't

- Put another proxy or CDN in front of the site: the certificate and the site's security headers come from Vercel.
- Add an `A` record for `www.jhtcs.org` as well as the CNAME (a name can't have both).

## Contacts

- Editorial office: [TO CONFIRM: name, email and phone]
- Technical contact (Super Admin): [TO CONFIRM: name and email]
