const TZ = "Africa/Lagos";

/** "15 January 2027" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(
    new Date(iso),
  );
}

/** "Jan 2027" */
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
}

/** ₦5,000 from 500000 kobo. Whole naira are shown without decimals. */
export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: Number.isInteger(naira) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(naira);
}

/** 1840 → "1,840" */
export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-GB").format(n);
}

/** Authors as a readable list: "A, B and C" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** "NGN 5,000": for PDFs, whose built-in fonts have no naira sign. */
export function formatNairaPlain(kobo: number): string {
  const naira = kobo / 100;
  return `NGN ${new Intl.NumberFormat("en-NG", { minimumFractionDigits: Number.isInteger(naira) ? 0 : 2, maximumFractionDigits: 2 }).format(naira)}`;
}
