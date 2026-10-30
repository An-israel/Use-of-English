/**
 * Download and view counting helpers (brief sections 9.3 and 10). Pure, so
 * file names, bot filtering and session hashing are unit-tested.
 */
import { createHash } from "node:crypto";

/** Crawlers, link previews, scripts and headless browsers are not counted. */
const BOT =
  /bot|crawl|spider|slurp|archiver|facebookexternalhit|embedly|preview|whatsapp|telegram|curl|wget|python|httpclient|okhttp|go-http|java\/|headless|lighthouse|pingdom|uptimerobot|monitor/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || userAgent.length < 10 || BOT.test(userAgent);
}

/**
 * A salted hash of address, browser and day: one reader counts once per day
 * per article, nothing personal is stored and yesterday's hashes cannot be
 * linked to today's (item 70).
 */
export function sessionHash(ip: string, userAgent: string, day: string, salt: string): string {
  return createHash("sha256").update(`${salt}|${day}|${ip}|${userAgent}`).digest("hex").slice(0, 40);
}

/** "Adaeze N. Okafor" → "Okafor"; "Nnamdi Ụzọ" → "Uzo". */
export function surname(name: string | null | undefined): string {
  const last = (name ?? "").trim().split(/\s+/).pop() ?? "";
  return last
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9-]/g, "");
}

/**
 * Clean file names (brief section 9.3): JHTS_Vol1_No2_2027_Okafor.pdf for an
 * article in an issue, JHTS_InPress_2027_Okafor.pdf before it has one, and
 * JHTS_Vol1_No2_2027.pdf for the full issue.
 */
export function downloadName(opts: {
  format: "pdf" | "docx";
  issue?: { volume: number; number: number; year: number } | null;
  year?: number;
  firstAuthor?: string | null;
  firstPage?: number | null;
}): string {
  const parts = ["JHTS"];
  if (opts.issue) parts.push(`Vol${opts.issue.volume}`, `No${opts.issue.number}`, String(opts.issue.year));
  else parts.push("InPress", String(opts.year ?? new Date().getUTCFullYear()));
  const who = surname(opts.firstAuthor);
  if (who) parts.push(who);
  return `${parts.join("_")}.${opts.format}`;
}
