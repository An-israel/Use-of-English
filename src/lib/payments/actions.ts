"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { RATE_LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { getViewer } from "@/lib/auth";
import { getFlags, getSettings } from "@/lib/data";
import { kickJobs } from "@/lib/jobs/kick";
import { logger } from "@/lib/log";
import { safeFileName } from "@/lib/submission";
import { adminClient, userClient } from "@/lib/supabase/clients";
import { Id, INVALID, StoragePath, UploadFile, validArgs } from "@/lib/validation";
import { PROOF_MAX_BYTES, PROOF_TYPES } from "./bank";

type Result = { ok: true; message?: string } | { ok: false; message: string };
const Fee = z.enum(["review", "publication"]);
const DUE_STATUS = { review: "awaiting_review_fee", publication: "accepted_awaiting_fee" } as const;

/** The signed-in author's submission, if this fee is due on it. */
async function dueFor(submissionId: string, fee: "review" | "publication") {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." } as const;
  // Ownership is checked through RLS: authors can only read their own submissions.
  const { data: s } = await (
    await userClient()
  )
    .from("submissions")
    .select("id, author_id, status, public_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!s || s.author_id !== viewer.id) return { error: "Submission not found." } as const;
  if (s.status !== DUE_STATUS[fee]) return { error: "This fee is not due." } as const;
  const [settings, flags] = await Promise.all([getSettings(), getFlags()]);
  if (!settings.fees.enabled || !flags.fees_enabled)
    return { error: "Fees are not being charged at present." } as const;
  return { viewer, submission: s, settings } as const;
}

/**
 * Step 1 of sending proof of a bank transfer: a one-time upload address for
 * the receipt in the private finance bucket (only the server can write there).
 */
export async function requestProofUpload(
  submissionId: string,
  fee: "review" | "publication",
  file: { name: string; size: number; type: string },
) {
  if (!validArgs(z.tuple([Id, Fee, UploadFile]), [submissionId, fee, file])) return INVALID;
  const due = await dueFor(submissionId, fee);
  if ("error" in due) return { ok: false as const, message: due.error as string };
  if (!(PROOF_TYPES as readonly string[]).includes(file.type))
    return { ok: false as const, message: "Upload the receipt as a PDF, JPG, PNG or WebP file." };
  if (file.size <= 0 || file.size > PROOF_MAX_BYTES)
    return { ok: false as const, message: "The receipt must be smaller than 5 MB." };
  const path = `proofs/${submissionId}/${fee}-${Date.now()}-${safeFileName(file.name)}`;
  const { data, error } = await adminClient().storage.from("finance").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, message: "Couldn’t prepare the upload. Please try again." };
  return { ok: true as const, path, token: data.token };
}

/**
 * Step 2: record the transfer with its receipt. The payment waits for the
 * Finance Officer to confirm it against the bank statement.
 */
export async function submitBankTransfer(input: {
  submissionId: string;
  fee: "review" | "publication";
  path: string;
  originalName: string;
  payer: string;
  transferDate: string;
}): Promise<Result> {
  const parsed = z
    .object({
      submissionId: Id,
      fee: Fee,
      path: StoragePath,
      originalName: z.string().max(255),
      payer: z.string().trim().min(2, "Enter the name the transfer was made in.").max(200),
      transferDate: z.iso.date("Enter the date of the transfer."),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? INVALID.message };
  const d = parsed.data;
  if (Date.parse(d.transferDate) > Date.now() + 86_400_000)
    return { ok: false, message: "The transfer date can’t be in the future." };
  if (!d.path.startsWith(`proofs/${d.submissionId}/${d.fee}-`)) return { ok: false, message: "Unexpected file path." };

  const due = await dueFor(d.submissionId, d.fee);
  if ("error" in due) return { ok: false, message: due.error as string };
  const limit = await rateLimit({ headers: await headers() }, RATE_LIMITS.payment, `payment:${due.viewer.id}`);
  if (!limit.allowed) return { ok: false, message: "Too many attempts. Please wait a few minutes." };

  const db = adminClient();
  // The upload must really be there, and be the kind of file we accept.
  const folder = d.path.slice(0, d.path.lastIndexOf("/"));
  const name = d.path.slice(d.path.lastIndexOf("/") + 1);
  const { data: listed } = await db.storage.from("finance").list(folder, { search: name });
  const meta = listed?.find((x) => x.name === name)?.metadata as { size?: number; mimetype?: string } | undefined;
  if (!meta?.size) return { ok: false, message: "The upload didn’t finish. Please try again." };
  if (meta.size > PROOF_MAX_BYTES || !(PROOF_TYPES as readonly string[]).includes(meta.mimetype ?? "")) {
    await db.storage.from("finance").remove([d.path]);
    return { ok: false, message: "Upload the receipt as a PDF, JPG, PNG or WebP file under 5 MB." };
  }

  // A new receipt replaces one still being checked; keep only the latest file.
  const { data: earlier } = await db
    .from("payments")
    .select("proof_path")
    .eq("submission_id", d.submissionId)
    .eq("fee_type", d.fee)
    .eq("status", "pending")
    .not("proof_submitted_at", "is", null)
    .maybeSingle();

  const amount = d.fee === "review" ? due.settings.fees.reviewKobo : due.settings.fees.publicationKobo;
  const { error } = await db.rpc("submit_bank_transfer", {
    p_submission: d.submissionId,
    p_fee: d.fee,
    p_amount_kobo: amount,
    p_proof_path: d.path,
    p_proof_name: d.originalName.slice(0, 200),
    p_payer: d.payer,
    p_transfer_date: d.transferDate,
  });
  if (error) {
    logger.warn({ err: error.message, submission: d.submissionId }, "bank transfer not recorded");
    await db.storage.from("finance").remove([d.path]);
    return {
      ok: false,
      message:
        error.message.includes("not due") || error.message.includes("settled")
          ? "This fee is not due."
          : "We couldn’t record your payment. Please try again.",
    };
  }
  if (earlier?.proof_path && earlier.proof_path !== d.path)
    await db.storage.from("finance").remove([earlier.proof_path]);
  kickJobs();
  revalidatePath(`/account/submissions/${d.submissionId}`);
  revalidatePath("/account");
  return {
    ok: true,
    message: "Thank you. We have your receipt and will confirm the payment once it shows in the journal’s account.",
  };
}
