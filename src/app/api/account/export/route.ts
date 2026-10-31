import { NextResponse, connection } from "next/server";
import { getViewer } from "@/lib/auth";
import { userClient } from "@/lib/supabase/clients";

/**
 * "Download my data" (I4, Nigeria Data Protection Act 2023, right of access).
 * Everything is read as the signed-in person, so row-level security returns
 * only their own records. Storage paths, internal notes and confidential
 * reviewer comments about their work are not included.
 */
export async function GET() {
  await connection();
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "signed_out" }, { status: 401 });
  const db = await userClient();
  const read = async <T>(q: PromiseLike<{ data: T | null; error: { message: string } | null }>) => {
    const { data, error } = await q;
    return error ? { unavailable: true } : (data ?? []);
  };
  const [profile, submissions, authors, files, events, payments, reviews] = await Promise.all([
    read(
      db
        .from("profiles")
        .select("full_name, email, role, affiliation, orcid, expertise, created_at, updated_at")
        .eq("id", viewer.id)
        .maybeSingle(),
    ),
    read(
      db
        .from("submissions")
        .select(
          "public_id, type, title, abstract, keywords, citation_style, status, declarations, submitted_at, decided_at, created_at, updated_at",
        )
        .eq("author_id", viewer.id),
    ),
    read(
      db
        .from("submission_authors")
        .select(
          "position, name, affiliation, email, orcid, is_corresponding, submission:submissions!inner(public_id, author_id)",
        )
        .eq("submission.author_id", viewer.id),
    ),
    read(
      db
        .from("submission_files")
        .select(
          "kind, version, original_name, mime_type, size_bytes, created_at, submission:submissions!inner(public_id, author_id)",
        )
        .eq("submission.author_id", viewer.id),
    ),
    read(
      db
        .from("submission_events")
        .select("from_status, to_status, message, created_at, submission:submissions!inner(public_id, author_id)")
        .eq("submission.author_id", viewer.id)
        .eq("visibility", "author"),
    ),
    read(
      db
        .from("payments")
        .select("reference, fee_type, amount_kobo, currency, status, channel, paid_at, receipt_number, created_at")
        .eq("author_id", viewer.id),
    ),
    read(
      db
        .from("review_assignments")
        .select(
          "round, status, due_at, invited_at, responded_at, recommendation, comments_to_author, comments_to_editor, submitted_at",
        )
        .eq("reviewer_id", viewer.id),
    ),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    journal: "Journal of Humanities and Transcultural Studies",
    note: "Your personal data held by JHTS. Amounts are in kobo (₦1 = 100 kobo). Write to the editorial office if anything is missing or wrong.",
    profile,
    submissions,
    submissionAuthors: authors,
    submissionFiles: files,
    submissionHistory: events,
    payments,
    reviews,
  };
  const day = body.exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jhts-my-data-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
