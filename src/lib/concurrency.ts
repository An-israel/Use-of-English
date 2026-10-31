/**
 * Run tasks with at most `limit` in flight (item 44: backpressure). Results
 * come back in input order; one task failing never stops the others.
 */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Best article for a file name: the one sharing the most words with it (slug or title). */
export function matchByName<T extends { slug: string; title: string }>(fileName: string, options: T[]): T | null {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/\.[a-z0-9]+$/, "")
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !["the", "and", "jhts", "pdf", "final", "vol"].includes(w)),
    );
  const file = words(fileName);
  let best: T | null = null;
  let score = 0;
  for (const o of options) {
    const own = words(`${o.slug} ${o.title}`);
    const shared = [...file].filter((w) => own.has(w)).length;
    if (shared > score) [best, score] = [o, shared];
  }
  return score >= 2 ? best : null;
}
