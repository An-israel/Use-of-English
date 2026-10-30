import "server-only";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/env";
import { userClient } from "@/lib/supabase/clients";
import type { Role } from "@/lib/workflow";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  affiliation: string | null;
  orcid: string | null;
  isActive: boolean;
};

/**
 * The signed-in person and their profile, or null. Reads the verified JWT
 * claims (not just the cookie) and then the profile through RLS.
 */
export async function getViewer(): Promise<Viewer | null> {
  if (isDemoMode) return null;
  const supabase = await userClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, affiliation, orcid, is_active")
    .eq("id", sub)
    .maybeSingle();
  if (!p || !p.is_active) return null;
  return {
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role,
    affiliation: p.affiliation,
    orcid: p.orcid,
    isActive: p.is_active,
  };
}

/** Only allow same-site relative paths as post-login destinations (no open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/account"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Role check on the server; RLS enforces the same rules in the database. */
export async function requireRole(roles: Role[], next: string): Promise<Viewer> {
  const viewer = await requireViewer(next);
  if (!roles.includes(viewer.role)) redirect("/account?denied=1");
  return viewer;
}
