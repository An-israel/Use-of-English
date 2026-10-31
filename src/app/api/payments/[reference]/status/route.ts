import { NextResponse, connection, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";
import { PaymentReference } from "@/lib/validation";

/** Status for the callback page to poll. Authors see only their own payments (RLS). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  await connection();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  const { reference } = await params;
  if (!PaymentReference.safeParse(reference).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data } = await (
    await userClient()
  )
    .from("payments")
    .select("status, fee_type, submission_id, receipt_number")
    .eq("reference", reference)
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
