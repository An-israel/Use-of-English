import { NextResponse, connection, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { getBoard, getFlags, getSettings } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { renderAcceptanceLetter } from "@/lib/pdf/documents";
import { userClient } from "@/lib/supabase/clients";
import { ARTICLE_TYPE_LABEL, type ArticleType } from "@/lib/types";
import { Id } from "@/lib/validation";

/** Acceptance letter PDF, available once the publication fee is paid or waived (section 5.18). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  const { id } = await params;
  if (!Id.safeParse(id).success) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const supabase = await userClient();
  const { data: s } = await supabase
    .from("submissions")
    .select("id, public_id, title, type, status, accepted_at, author_id")
    .eq("id", id)
    .maybeSingle();
  if (!s || (s.author_id !== viewer.id && !["super_admin", "editor"].includes(viewer.role))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const [settings, flags, board] = await Promise.all([getSettings(), getFlags(), getBoard()]);
  const feesOn = settings.fees.enabled && flags.fees_enabled;
  const { data: paid } = await supabase
    .from("payments")
    .select("status, receipt_number")
    .eq("submission_id", id)
    .eq("fee_type", "publication")
    .in("status", ["success", "waived"])
    .maybeSingle();
  if (!["in_production", "published"].includes(s.status) || (feesOn && !paid)) {
    return NextResponse.json({ error: "not_available_yet" }, { status: 409 });
  }
  const { data: authors } = await supabase
    .from("submission_authors")
    .select("name, is_corresponding")
    .eq("submission_id", id)
    .order("position");
  const corresponding = authors?.find((a) => a.is_corresponding)?.name ?? viewer.fullName;
  const pdf = await renderAcceptanceLetter({
    date: formatDate(s.accepted_at ?? new Date().toISOString()),
    authorName: corresponding,
    coAuthors: (authors ?? []).map((a) => a.name).filter((n) => n !== corresponding),
    title: s.title,
    publicId: s.public_id,
    articleType: ARTICLE_TYPE_LABEL[s.type as ArticleType],
    editorName: board.find((m) => m.group === "editor_in_chief")?.name ?? "Editor-in-Chief",
    feeLine: !feesOn
      ? "No publication fee is due."
      : paid?.status === "waived"
        ? "The publication fee for this article has been waived by the editors."
        : `The publication fee has been received with thanks (receipt ${paid?.receipt_number}).`,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="JHTS_Acceptance_${s.public_id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
