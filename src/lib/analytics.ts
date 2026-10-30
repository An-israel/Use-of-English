/** Aggregation for the analytics dashboard (brief section 10). Pure and unit-tested. */

export type DailyRow = {
  day: string;
  article_id: string;
  views: number;
  downloads_pdf: number;
  downloads_docx: number;
};
export type Point = { day: string; views: number; downloads: number };

export const RANGES = { "30": 30, "90": 90, "365": 365 } as const;
export type RangeKey = keyof typeof RANGES;

const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** One point per day from `from` to `to` inclusive, zeros where nothing happened. */
export function dailySeries(rows: DailyRow[], from: string, to: string): Point[] {
  const by = new Map<string, Point>();
  for (let d = from; d <= to; d = addDays(d, 1)) by.set(d, { day: d, views: 0, downloads: 0 });
  for (const r of rows) {
    const p = by.get(r.day);
    if (!p) continue;
    p.views += r.views;
    p.downloads += r.downloads_pdf + r.downloads_docx;
  }
  return [...by.values()];
}

/** Long ranges read better as weeks: each point is the sum of 7 days, dated by its first day. */
export function weekly(points: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i += 7) {
    const w = points.slice(i, i + 7);
    out.push({
      day: w[0].day,
      views: w.reduce((s, p) => s + p.views, 0),
      downloads: w.reduce((s, p) => s + p.downloads, 0),
    });
  }
  return out;
}

export type TopArticle = { id: string; views: number; downloads: number };

export function topArticles(rows: DailyRow[], limit = 10): TopArticle[] {
  const by = new Map<string, TopArticle>();
  for (const r of rows) {
    const t = by.get(r.article_id) ?? { id: r.article_id, views: 0, downloads: 0 };
    t.views += r.views;
    t.downloads += r.downloads_pdf + r.downloads_docx;
    by.set(r.article_id, t);
  }
  return [...by.values()].sort((a, b) => b.views - a.views || b.downloads - a.downloads).slice(0, limit);
}

export { addDays };
