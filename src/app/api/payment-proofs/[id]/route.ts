import { NextResponse, connection, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { adminClient, userClient } from "@/lib/supabase/clients";
import { Id } from "@/lib/validation";

/**
 * The transfer receipt an author uploaded: the author, Finance Officers,
 * Editors and Super Admins (RLS decides who can read the payment row).
 * Opened in the browser so a photo or PDF can be checked at a glance.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  const { id } = await params;
  if (!Id.safeParse(id).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await (await userClient()).from("payments").select("proof_path").eq("id", id).maybeSingle();
  if (!data?.proof_path) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: signed } = await adminClient().storage.from("finance").createSignedUrl(data.proof_path, 60);
  if (!signed) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
