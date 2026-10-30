export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Default month for each quarterly issue number: 1→March, 2→June, 3→September, 4→December. */
export function defaultMonthForIssue(issue: number): number {
  return [3, 6, 9, 12][(issue - 1) % 4] ?? 3;
}

export function monthName(month: number): string {
  const name = MONTHS[month - 1];
  if (!name) throw new RangeError(`Invalid month: ${month}`);
  return name;
}

export type IssueRef = { volume: number; number: number; month: number; year: number };

/** "Volume 1, Issue 2 (June 2027)" */
export function issueLabel({ volume, number, month, year }: IssueRef): string {
  return `Volume ${volume}, Issue ${number} (${monthName(month)} ${year})`;
}

/** "Vol. 1 No. 2 (2027)" — where space is tight */
export function issueLabelShort({ volume, number, year }: Pick<IssueRef, "volume" | "number" | "year">): string {
  return `Vol. ${volume} No. ${number} (${year})`;
}

/** "VOLUME 1 · ISSUE 2 · JUNE 2027" source text (render with .smallcaps) */
export function issueRunningHead({ volume, number, month, year }: IssueRef): string {
  return `Volume ${volume} · Issue ${number} · ${monthName(month)} ${year}`;
}

/** Path segment for an issue page: /issues/1/2 */
export function issuePath({ volume, number }: Pick<IssueRef, "volume" | "number">): string {
  return `/issues/${volume}/${number}`;
}

/** "pp. 1–24", "p. 7", or "" */
export function pageRange(first?: number | null, last?: number | null): string {
  if (first == null) return "";
  if (last == null || last === first) return `p. ${first}`;
  return `pp. ${first}–${last}`;
}
