// Lists every object in every Storage bucket as JSON (bucket, path, size,
// type, updated). Part of the weekly backup: with it, a restore can check that
// every file the database refers to came back.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
const db = createClient(url, key, { auth: { persistSession: false } });

async function walk(bucket, prefix, out) {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const o of data) {
      const path = prefix ? `${prefix}/${o.name}` : o.name;
      if (o.id === null)
        await walk(bucket, path, out); // a folder
      else
        out.push({
          bucket,
          path,
          size: o.metadata?.size ?? null,
          type: o.metadata?.mimetype ?? null,
          updated: o.updated_at,
        });
    }
    if (data.length < 1000) break;
  }
}

const { data: buckets, error } = await db.storage.listBuckets();
if (error) throw new Error(error.message);
const files = [];
for (const b of buckets) await walk(b.id, "", files);
process.stdout.write(JSON.stringify({ generated: new Date().toISOString(), count: files.length, files }, null, 1));
