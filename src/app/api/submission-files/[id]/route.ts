import { NextResponse, connection, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { adminClient, userClient } from "@/lib/supabase/clients";

/** Short-lived download link for a submission file the viewer may read (RLS on submission_files). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  const { id } = await params;
  const { data } = await (
    await userClient()
  )
    .from("submission_files")
    .select("storage_path, original_name")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: signed } = await adminClient()
    .storage.from("submissions")
    .createSignedUrl(data.storage_path, 60, { download: data.original_name });
  if (!signed) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
