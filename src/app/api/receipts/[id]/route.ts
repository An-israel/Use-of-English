import { NextResponse, connection, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { adminClient, userClient } from "@/lib/supabase/clients";

/** Receipt PDF: the payer, Finance Officers, Editors and Super Admins (RLS decides who can read the row). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  const { id } = await params;
  const { data } = await (
    await userClient()
  )
    .from("payments")
    .select("receipt_path, receipt_number")
    .eq("id", id)
    .maybeSingle();
  if (!data?.receipt_path) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: signed } = await adminClient()
    .storage.from("finance")
    .createSignedUrl(data.receipt_path, 60, { download: `JHTS_Receipt_${data.receipt_number}.pdf` });
  if (!signed) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.redirect(signed.signedUrl, { headers: { "Cache-Control": "no-store" } });
}
