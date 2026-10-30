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
