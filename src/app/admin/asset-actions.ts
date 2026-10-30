"use server";

import { ASSET_SLOTS, entityOf, keyColumn, slotOf, type AssetSlotKey } from "@/lib/admin/assets";
import { CONTENT_EDITORS, dbMessage, expire, staff, type ActionResult } from "@/lib/admin/server";
import { TAGS } from "@/lib/data";
import { adminClient } from "@/lib/supabase/clients";
import { safeFileName } from "@/lib/submission";

/**
 * Covers, PDFs and photos go straight from the browser to Storage through a
 * signed upload URL (items 41 and 90). Replacing a file keeps the previous
 * one and records it in file_versions.
 */

const isSlot = (k: string): k is AssetSlotKey => k in ASSET_SLOTS;

export async function requestAssetUpload(
  key: string,
  id: string,
  file: { name: string; size: number; type: string },
): Promise<{ ok: true; path: string; token: string; bucket: string } | { ok: false; message: string }> {
  const s = await staff(CONTENT_EDITORS);
  if (!s || !isSlot(key)) return { ok: false, message: "You don’t have permission to upload here." };
  const spec = ASSET_SLOTS[key];
  if (!(spec.types as readonly string[]).includes(file.type))
    return { ok: false, message: `${spec.label}: that file type isn’t accepted.` };
  if (file.size <= 0 || file.size > spec.maxMb * 1024 * 1024)
    return { ok: false, message: `${spec.label} must be smaller than ${spec.maxMb} MB.` };
  // The row must exist and be editable by this person (RLS decides).
  const { data: row } = await s.db.from(spec.table).select(keyColumn(key)).eq(keyColumn(key), id).maybeSingle();
  if (!row) return { ok: false, message: "That item no longer exists." };

  const path = `${spec.folder}/${id}/v${Date.now().toString(36)}-${safeFileName(file.name)}`;
  const admin = adminClient();
  const { data, error } = await admin.storage.from(spec.bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, message: "Couldn’t prepare the upload. Please try again." };
  await admin.from("pending_uploads").upsert({ storage_path: path, bucket: spec.bucket, owner_id: s.viewer.id });
  return { ok: true, path, token: data.token, bucket: spec.bucket };
}

export async function commitAsset(key: string, id: string, path: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s || !isSlot(key)) return { ok: false, message: "You don’t have permission to upload here." };
  const spec = ASSET_SLOTS[key];
  if (!path.startsWith(`${spec.folder}/${id}/v`)) return { ok: false, message: "Unexpected file path." };

  const admin = adminClient();
  const folder = path.slice(0, path.lastIndexOf("/"));
  const name = path.slice(path.lastIndexOf("/") + 1);
  const { data: listed } = await admin.storage.from(spec.bucket).list(folder, { search: name });
  const meta = listed?.find((o) => o.name === name)?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta?.size) return { ok: false, message: "The upload didn’t finish. Please try again." };
  if (!(spec.types as readonly string[]).includes(meta.mimetype ?? "") || meta.size > spec.maxMb * 1024 * 1024) {
    await admin.storage.from(spec.bucket).remove([path]);
    return { ok: false, message: "That file type or size isn’t accepted." };
  }

  const { data: before } = await s.db
    .from(spec.table)
    .select(spec.column)
    .eq(keyColumn(key), id)
    .maybeSingle<Record<string, string | null>>();
  const { error } = await s.db
    .from(spec.table)
    .update({ [spec.column]: path })
    .eq(keyColumn(key), id);
  if (error) return { ok: false, message: dbMessage(error, "Couldn’t attach the file.") };
  const previous = before?.[spec.column];
  if (previous && entityOf(key) !== "board") {
    await admin.from("file_versions").insert({
      entity: entityOf(key),
      entity_id: id,
      slot: slotOf(key),
      storage_path: previous,
      replaced_by: s.viewer.id,
    });
  }
  await admin.from("pending_uploads").delete().eq("storage_path", path);
  expire(...tagsFor(key));
  return { ok: true, message: `${spec.label} ${previous ? "replaced; the previous file is kept" : "uploaded"}.` };
}

/** Detach a file (e.g. go back to the generated cover). The file itself is kept. */
export async function clearAsset(key: string, id: string): Promise<ActionResult> {
  const s = await staff(CONTENT_EDITORS);
  if (!s || !isSlot(key)) return { ok: false, message: "You don’t have permission to do that." };
  const spec = ASSET_SLOTS[key];
  const { data: before } = await s.db
    .from(spec.table)
    .select(spec.column)
    .eq(keyColumn(key), id)
    .maybeSingle<Record<string, string | null>>();
  const { error } = await s.db
    .from(spec.table)
    .update({ [spec.column]: null })
    .eq(keyColumn(key), id);
  if (error) return { ok: false, message: dbMessage(error) };
  const previous = before?.[spec.column];
  if (previous && entityOf(key) !== "board")
    await adminClient()
      .from("file_versions")
      .insert({
        entity: entityOf(key),
        entity_id: id,
        slot: slotOf(key),
        storage_path: previous,
        replaced_by: s.viewer.id,
      });
  expire(...tagsFor(key));
  return { ok: true, message: `${spec.label} removed.` };
}

function tagsFor(key: AssetSlotKey): string[] {
  switch (entityOf(key)) {
    case "issue":
      return [TAGS.issues, TAGS.articles];
    case "board":
      return [TAGS.board];
    default:
      return [TAGS.articles];
  }
}
