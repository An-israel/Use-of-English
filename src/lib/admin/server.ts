import "server-only";
import { updateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getViewer, type Viewer } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";
import type { Role } from "@/lib/workflow";

/**
 * Shared plumbing for admin server actions: role checks, friendly database
 * errors, optimistic-locking updates and cache invalidation.
 */

export type ActionResult = { ok: boolean; message: string; conflict?: boolean; id?: string; version?: number };

export const EDITORS: Role[] = ["super_admin", "editor"];
export const CONTENT_EDITORS: Role[] = ["super_admin", "editor", "book_review_editor"];

export async function staff(roles: Role[]): Promise<{ viewer: Viewer; db: SupabaseClient } | null> {
  const viewer = await getViewer();
  if (!viewer || !roles.includes(viewer.role)) return null;
  return { viewer, db: await userClient() };
}

export const denied: ActionResult = { ok: false, message: "You don’t have permission to do that." };

export const CONFLICT_MESSAGE =
  "Someone else saved this while you were editing. Reload to see their changes, then make yours again.";

/** Turns a PostgREST/Postgres error into something an editor can act on. */
export function dbMessage(
  error: { code?: string; message?: string } | null,
  fallback = "That couldn’t be saved.",
): string {
  if (!error) return fallback;
  switch (error.code) {
    case "23505":
      return error.message?.includes("slug")
        ? "That URL slug is already used. Choose another."
        : "That would create a duplicate.";
    case "23503":
      return "Something else still refers to this item, so it can’t be removed.";
    case "42501":
      return "You don’t have permission to do that.";
    case "23514":
    case "P0001":
    case "P0002":
      // Our own raise exception messages are written for editors.
      return error.message ?? fallback;
    default:
      return fallback;
  }
}

/**
 * Update one row only if it still has the version the form was loaded with
 * (item 36). Returns a conflict result when someone else saved first.
 */
export async function lockedUpdate(
  db: SupabaseClient,
  table: string,
  id: string,
  version: number,
  patch: Record<string, unknown>,
  key = "id",
): Promise<ActionResult & { version?: number }> {
  const { data, error } = await db.from(table).update(patch).eq(key, id).eq("version", version).select("version");
  if (error) return { ok: false, message: dbMessage(error) };
  if (!data?.length) return { ok: false, conflict: true, message: CONFLICT_MESSAGE };
  return { ok: true, message: "Saved.", version: data[0].version as number };
}

/** Expire public caches right away so editors see their change (server actions only). */
export function expire(...tags: string[]) {
  for (const t of new Set(tags)) updateTag(t);
}

/** "a-title, with: punctuation" → "a-title-with-punctuation" */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
export const optional = (form: FormData, k: string) => str(form, k) || null;
export const int = (form: FormData, k: string) => {
  const v = str(form, k);
  return v && /^\d+$/.test(v) ? Number(v) : null;
};
