# Postmortem: [short title]

**Blameless.** This document explains what happened and how the system and our processes let it happen, so we can make it less likely. It never assigns fault to a person. Write facts, not judgements.

|                  |                                                                               |
| ---------------- | ----------------------------------------------------------------------------- |
| Date of incident | [YYYY-MM-DD]                                                                  |
| Duration         | [from first impact to full recovery, e.g. 1 h 20 min]                         |
| Severity         | [1: site down or money/data at risk · 2: a main feature broken · 3: degraded] |
| Author(s)        | [names]                                                                       |
| Status           | [draft · reviewed · actions complete]                                         |

## Summary

Two or three sentences a non-technical reader understands: what broke, who was affected, how it was fixed.

## Impact

- **Who was affected**: [readers, authors, reviewers, editors, finance]
- **How many**: [e.g. 14 authors could not pay; all readers saw an error page]
- **Money or data**: [any payment, file or record lost, duplicated or exposed? If none, say so]
- **Error budget used**: [minutes of downtime this month / 219 minutes allowed]

## Timeline

All times WAT (Africa/Lagos).

| Time    | What happened                                                    |
| ------- | ---------------------------------------------------------------- |
| [HH:MM] | [first sign of the problem: the change, the alert or the report] |
| [HH:MM] | [when we noticed, and how]                                       |
| [HH:MM] | [what we tried]                                                  |
| [HH:MM] | [mitigation: impact stopped]                                     |
| [HH:MM] | [full recovery]                                                  |

## Root cause

What actually caused it, traced back with "why?" until the answer is something we can change. Link the commit, deployment, log lines (request ids) or provider status page.

## Detection

How we found out. Did an alert fire, or did a person report it? How long between the start and our knowing? If an alert should have fired and didn't, that is an action item.

## Resolution

What fixed it, and why that worked.

## What went well

- [e.g. the rollback took a minute; reconciliation caught every unconfirmed payment]

## What went poorly

- [e.g. no alert for this case; the runbook step was out of date]

## Action items

Each one specific, owned and dated. Prefer changes to the system (tests, alerts, safeguards) over "be more careful".

| Action                             | Type (prevent · detect · mitigate · document) | Owner  | Due    | Done |
| ---------------------------------- | --------------------------------------------- | ------ | ------ | ---- |
| [e.g. add an end-to-end test for…] | prevent                                       | [name] | [date] | [ ]  |
| [e.g. alert when…]                 | detect                                        | [name] | [date] | [ ]  |
| [e.g. update RUNBOOK.md section…]  | document                                      | [name] | [date] | [ ]  |

## Lessons

One or two sentences worth remembering beyond this incident.
