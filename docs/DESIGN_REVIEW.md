# Design self-review: Milestone 2 checkpoint

Brief section 3.6. Screenshots at 390, 1024 and 1440 px in light and dark themes (`npm run screenshots`). Scores are out of 10.

| Page                    | Hierarchy | Typography | Spacing rhythm | Colour restraint | Originality | Mobile |
| ----------------------- | --------- | ---------- | -------------- | ---------------- | ----------- | ------ |
| Home                    | 9         | 9          | 8              | 9                | 8           | 8      |
| Issue (`/issues/1/1`)   | 9         | 9          | 8              | 9                | 8           | 8      |
| Article (`/articles/…`) | 9         | 9          | 8              | 9                | 8           | 8      |
| Editorial Board         | 9         | 9          | 9              | 9                | 8           | 8      |

## Fixed during review (each scored below 8 before the fix)

| Issue found                                                                        | Score before    | Fix                                                                                                                                                      |
| ---------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ochre used for small text (running heads, "most read" numerals) measured 2.4–2.6:1 | Colour 6        | New `--thread-text` token (4.9:1 light, 8.9:1 dark); raw ochre is now decorative only. `node scripts/contrast.mjs` checks every pairing against WCAG AA. |
| Full-text paragraphs had no spacing (the rule missed paragraphs inside a wrapper)  | Spacing 6       | Rich text is rendered directly into the prose container.                                                                                                 |
| Titles in tables of contents broke into short lines (balanced wrapping)            | Typography 7    | Balanced wrapping only for h1/h2; pretty wrapping for h3/h4.                                                                                             |
| Issue table of contents grouped by type jumped around in page order                | Hierarchy 7     | Type groups follow the page order of their first article.                                                                                                |
| Mobile article showed share and count tools before the abstract                    | Mobile 7        | Tools move below the text on small screens.                                                                                                              |
| Eight subject tiles stacked into one very long column on phones                    | Mobile 7        | Two compact tiles per row on phones, with descriptions from tablet width up.                                                                             |
| Header wrapped "Sign in" and the Submit button at 1024 px (Milestone 1)            | Mobile/tablet 7 | No-wrap buttons; "Sign in" shows from 1280 px.                                                                                                           |

## Known limits at this checkpoint

- The embedded PDF reader and download counting arrive with the download routes (Milestone 8). Sample articles have no PDFs, so their PDF and Word buttons are hidden, as the brief requires for missing formats.
- "Most read this month" uses lifetime views until monthly metrics exist (Milestone 8).
- All issues, articles and authors shown are SAMPLE content.

# Milestone 3: public site

Every page reviewed at 390, 1024 and 1440 px.

| Page                                       | Hierarchy | Typography | Spacing rhythm | Colour restraint | Originality | Mobile |
| ------------------------------------------ | --------- | ---------- | -------------- | ---------------- | ----------- | ------ |
| All Issues                                 | 9         | 9          | 8              | 9                | 8           | 8      |
| Articles in Press                          | 8         | 9          | 8              | 9                | 8           | 8      |
| Book Reviews                               | 9         | 9          | 8              | 9                | 8           | 8      |
| Subjects and subject pages                 | 9         | 9          | 8              | 9                | 9           | 8      |
| Search                                     | 8         | 9          | 8              | 9                | 8           | 8      |
| About, Aims and Scope, Use of English Unit | 8         | 9          | 8              | 9                | 8           | 8      |
| Call for Papers, Author Guidelines, Fees   | 9         | 9          | 8              | 9                | 8           | 8      |
| Policies and policy pages                  | 8         | 9          | 8              | 9                | 8           | 8      |
| Contact                                    | 8         | 9          | 8              | 9                | 8           | 8      |

## Fixed during review

| Issue found                                                                | Score before  | Fix                                                                                  |
| -------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| Pages without a contents list left an empty column and looked off-centre   | Spacing 7     | Reading column leans left (asymmetric) when there is no contents list.               |
| Subject lists mixed issues but showed only page numbers                    | Hierarchy 7   | Rows in mixed lists show their issue label above the pages.                          |
| Search filters filled the first screen on phones                           | Mobile 7      | Filters fold behind a "Filters" control on small screens (works without JavaScript). |
| The archive's year index and year filter shared a label for screen readers | Accessibility | Index renamed "Jump to year".                                                        |

# Design self-review: Milestone 6 (admin dashboard)

The admin uses the same fonts and tokens in a denser, calmer working layout. Screenshots at 390, 1024 and 1440 px, light and dark.

| Screen                                   | Hierarchy | Typography | Spacing rhythm | Colour restraint | Originality | Mobile |
| ---------------------------------------- | --------- | ---------- | -------------- | ---------------- | ----------- | ------ |
| Overview                                 | 9         | 9          | 8              | 9                | 8           | 8      |
| Submissions (table and board)            | 9         | 8          | 8              | 9                | 8           | 8      |
| Submission detail (review, files, fees)  | 8         | 9          | 8              | 9                | 8           | 8      |
| Issue editor (contents, cover, schedule) | 9         | 9          | 8              | 9                | 9           | 8      |
| Article editor                           | 8         | 9          | 8              | 9                | 8           | 8      |
| Pages editor with live preview           | 9         | 9          | 8              | 9                | 8           | 8      |
| Categories, board, Call for Papers       | 8         | 8          | 8              | 9                | 8           | 8      |
| Settings and feature flags               | 8         | 8          | 8              | 9                | 8           | 8      |
| Reviewer page (`/review/…`)              | 9         | 9          | 8              | 9                | 8           | 8      |

## Fixed during review

| Issue found                                                                                      | Score before | Fix                                                                                      |
| ------------------------------------------------------------------------------------------------ | ------------ | ---------------------------------------------------------------------------------------- |
| The visual editor silently flattened tables, footnotes, sidenotes and [TO CONFIRM] marks on save | Data loss    | Such text opens in HTML mode; switching to visual warns first.                           |
| Page preview sat below the editor at desktop widths, so it wasn't "live" in practice             | Hierarchy 7  | Side by side from 1280 px.                                                               |
| Status, note and waiver controls kept the large site buttons and inputs                          | Typography 7 | Restyled with the admin's denser inputs and buttons.                                     |
| Fee tile figure overflowed its tile at 390 px                                                    | Mobile 6     | Smaller figure on phones.                                                                |
| Issue contents showed "pp. pp. 1–24"                                                             | Typography 7 | Page range printed once.                                                                 |
| A 404 inside the public site showed the header and footer twice (since milestone 3)              | Hierarchy 4  | The site group has its own not-found page; the root one keeps the chrome for other URLs. |
| Two reviewers with the same name looked identical in the reviewer picker                         | Usability    | The picker shows each reviewer's email and current load.                                 |

# Design self-review: Milestone 7 (finance)

| Screen                                 | Hierarchy | Typography | Spacing rhythm | Colour restraint | Originality | Mobile |
| -------------------------------------- | --------- | ---------- | -------------- | ---------------- | ----------- | ------ |
| Payments (filters, totals, ledger)     | 9         | 8          | 8              | 9                | 8           | 8      |
| Payment detail and refund              | 9         | 9          | 8              | 9                | 8           | 8      |
| Reconciliation                         | 9         | 9          | 8              | 9                | 8           | 8      |
| Fund summary                           | 9         | 9          | 8              | 9                | 8           | 8      |
| PDF payments report and fund statement | 8         | 8          | 8              | 9                | 8           | n/a    |

## Fixed during review

| Issue found                                                             | Score before | Fix                                                  |
| ----------------------------------------------------------------------- | ------------ | ---------------------------------------------------- |
| The PDF report pushed the ledger to page 2, leaving page 1 mostly empty | Spacing 6    | The ledger follows the totals on the same page.      |
| Months printed as "2027-04" in the PDF                                  | Typography 7 | Month names ("April 2027") on screen and in the PDF. |
| On phones the ledger was a wide table you had to scroll sideways        | Mobile 6     | A compact card list below 640 px; the table above.   |

# Design self-review: Milestone 8 (downloads, analytics and indexing)

| Screen                          | Hierarchy | Typography | Spacing rhythm | Colour restraint | Originality | Mobile |
| ------------------------------- | --------- | ---------- | -------------- | ---------------- | ----------- | ------ |
| Analytics                       | 9         | 9          | 8              | 9                | 8           | 8      |
| Article page with PDF reader    | 9         | 9          | 8              | 9                | 8           | 8      |
| Open Graph cards                | 9         | 9          | 9              | 9                | 9           | n/a    |
| Issue editor: DOIs and Crossref | 8         | 8          | 8              | 9                | 8           | 8      |

## Fixed during review

| Issue found                                                      | Score before | Fix                                                |
| ---------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| The reader rendered only its first two pages                     | Broken       | Page observers are attached after the pages mount. |
| "1 views" in the most-read list                                  | Typography 7 | Singular and plural, "downloads" spelled out.      |
| Most-read figures took a fixed width and squeezed bars on phones | Mobile 7     | Figures size to their content.                     |

# Design self-review: Milestone 9 (reliability and operations)

| Screen                      | Hierarchy | Typography | Spacing rhythm | Colour restraint | Originality | Mobile |
| --------------------------- | --------- | ---------- | -------------- | ---------------- | ----------- | ------ |
| System                      | 9         | 8          | 8              | 9                | 8           | 8      |
| Audit log                   | 8         | 8          | 8              | 9                | 8           | 8      |
| Notifications panel         | 9         | 9          | 8              | 9                | 8           | 8      |
| Bulk PDF upload             | 9         | 8          | 8              | 9                | 8           | 8      |
| Service unavailable (admin) | 9         | 9          | 8              | 9                | 8           | 8      |

## Fixed during review

| Issue found                                                                 | Score before | Fix                                                                            |
| --------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| With the database down, the admin redirected to the login page              | Broken       | A failed profile read is reported as an outage; the admin shows a clear panel. |
| A new failed payment or contact message broke event recording (trigger bug) | Broken       | The notification trigger was rewritten and can no longer block an event.       |

# Design self-review: Milestone 10 (polish and launch)

| Screen                                                    | Hierarchy | Typography | Spacing rhythm | Colour restraint | Originality | Mobile |
| --------------------------------------------------------- | --------- | ---------- | -------------- | ---------------- | ----------- | ------ |
| Home on launch day (no issue yet)                         | 9         | 9          | 8              | 9                | 9           | 8      |
| All Issues, before the first issue                        | 9         | 9          | 8              | 9                | 8           | 9      |
| Subject page with no articles                             | 8         | 9          | 8              | 9                | 8           | 8      |
| Editor's Handbook (admin)                                 | 9         | 9          | 8              | 9                | 8           | 8      |
| Public pages after the performance pass (reveals, weaves) | 9         | 9          | 8              | 9                | 9           | 8      |

## Fixed during review

| Issue found                                                                  | Score before | Fix                                                                   |
| ---------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| With no issue, "Read the current issue" led to an empty archive              | Hierarchy 6  | The hero leads with "Read the Call for Papers" until the first issue. |
| A blank band on the home page where most-read and reviews would be           | Spacing 5    | The section is left out when it has nothing to show.                  |
| Every subject tile said "0 articles"                                         | Typography 7 | Counts appear once there are articles.                                |
| Empty archive said "No issues match… clear the filters" with useless filters | Hierarchy 6  | "The first issue is in preparation", with the Call for Papers link.   |
| [TO CONFIRM] marks were 4.1:1 on ivory                                       | Colour 7     | A darker terracotta for small text (5.3:1).                           |
| Reveal fades left text partly transparent while scrolling                    | Colour 7     | The reveal is a rise only; text is always at full contrast.           |
