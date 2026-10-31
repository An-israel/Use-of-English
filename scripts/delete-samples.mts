/**
 * Removes every SAMPLE volume, issue and article before launch (brief 14.2):
 * first their files in Storage (PDFs, Word files, covers and earlier
 * versions), then the rows (scripts/db/delete-samples.sql).
 *
 *   npm run samples:delete            asks for confirmation
 *   npm run samples:delete -- --yes   for scripted use
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL
 * for the same project; with NEXT_PUBLIC_SITE_URL and CRON_SECRET it also
 * refreshes the live site's pages afterwards. Real content is never touched: only rows marked
 * is_sample are selected.
 */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { ASSET_SLOTS, entityOf, slotOf } from "../src/lib/admin/assets";

const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, DATABASE_URL: dbUrl } = process.env;
if (!url || !key || !dbUrl) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL for the target project.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const [{ data: articles, error: e1 }, { data: issues, error: e2 }, { count: volumes }] = await Promise.all([
  db.from("articles").select("id, title").eq("is_sample", true),
  db.from("issues").select("id").eq("is_sample", true),
  db.from("volumes").select("id", { count: "exact", head: true }).eq("is_sample", true),
]);
if (e1 || e2) throw e1 ?? e2;
// Book reviews are articles, keyed by article_id.
const ids: Record<string, string[]> = {
  article: articles!.map((a) => a.id),
  issue: issues!.map((i) => i.id),
  book_review: articles!.map((a) => a.id),
};

// Current files in each slot, plus every earlier version kept in file_versions.
const files = new Map<string, Set<string>>();
const add = (bucket: string, path: string | null) => {
  if (!path) return;
  if (!files.has(bucket)) files.set(bucket, new Set());
  files.get(bucket)!.add(path);
};
for (const [slotKey, spec] of Object.entries(ASSET_SLOTS)) {
  const entity = entityOf(slotKey as keyof typeof ASSET_SLOTS);
  if (entity === "board") continue; // the board is real, never sample
  const list = ids[entity] ?? [];
  if (!list.length) continue;
  const keyCol = entity === "book_review" ? "article_id" : "id";
  const { data } = await db.from(spec.table).select(spec.column).in(keyCol, list);
  for (const row of (data ?? []) as unknown as Record<string, string | null>[]) add(spec.bucket, row[spec.column]);
  const { data: versions } = await db
    .from("file_versions")
    .select("storage_path")
    .eq("entity", entity)
    .eq("slot", slotOf(slotKey as keyof typeof ASSET_SLOTS))
    .in("entity_id", list);
  for (const v of versions ?? []) add(spec.bucket, v.storage_path);
}
const fileCount = [...files.values()].reduce((n, s) => n + s.size, 0);

console.log(
  `Sample content: ${volumes ?? 0} volumes, ${ids.issue.length} issues, ${ids.article.length} articles, ${fileCount} files.`,
);
if (!ids.article.length && !ids.issue.length && !volumes) {
  console.log("Nothing to delete.");
  process.exit(0);
}
if (!process.argv.includes("--yes")) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This permanently deletes them from ${url}. Type "delete samples" to continue: `);
  rl.close();
  if (answer.trim() !== "delete samples") {
    console.log("Cancelled; nothing was deleted.");
    process.exit(1);
  }
}

for (const [bucket, paths] of files) {
  const list = [...paths];
  for (let i = 0; i < list.length; i += 100) {
    const { error } = await db.storage.from(bucket).remove(list.slice(i, i + 100));
    if (error) throw error;
  }
}
const sql = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", "scripts/db/delete-samples.sql"], {
  stdio: "inherit",
});
if (sql.status !== 0) process.exit(sql.status ?? 1);
console.log(`Deleted ${ids.article.length} articles, ${ids.issue.length} issues and ${fileCount} files.`);

// The site caches content for hours; ask it to refresh now.
const site = process.env.NEXT_PUBLIC_SITE_URL;
const cron = process.env.CRON_SECRET;
const refreshed =
  site && cron
    ? await fetch(`${site}/api/cron/revalidate`, { method: "POST", headers: { Authorization: `Bearer ${cron}` } })
        .then((r) => r.ok)
        .catch(() => false)
    : false;
console.log(
  refreshed
    ? `Refreshed the pages at ${site}.`
    : "Couldn’t refresh the site’s pages: they update within a few hours, or run the refresh in docs/RUNBOOK.md.",
);
