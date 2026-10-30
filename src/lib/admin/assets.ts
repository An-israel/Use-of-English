/**
 * Where each replaceable file lives. Shared by the upload actions (server)
 * and the upload control (client), so both agree on types and limits.
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type AssetEntity = "article" | "issue" | "book_review" | "board";

export const ASSET_SLOTS = {
  "article:pdf": {
    bucket: "published",
    table: "articles",
    column: "pdf_path",
    folder: "articles",
    types: [PDF],
    maxMb: 50,
    label: "PDF",
  },
  "article:docx": {
    bucket: "published",
    table: "articles",
    column: "docx_path",
    folder: "articles",
    types: [DOCX],
    maxMb: 50,
    label: "Word (DOCX)",
  },
  "issue:cover": {
    bucket: "covers",
    table: "issues",
    column: "cover_path",
    folder: "issues",
    types: IMAGE_TYPES,
    maxMb: 5,
    label: "Cover image",
  },
  "issue:full_pdf": {
    bucket: "published",
    table: "issues",
    column: "full_pdf_path",
    folder: "issues",
    types: [PDF],
    maxMb: 50,
    label: "Full issue PDF",
  },
  "issue:full_docx": {
    bucket: "published",
    table: "issues",
    column: "full_docx_path",
    folder: "issues",
    types: [DOCX],
    maxMb: 50,
    label: "Full issue DOCX",
  },
  "book_review:book_cover": {
    bucket: "covers",
    table: "book_reviews",
    column: "book_cover_path",
    folder: "books",
    types: IMAGE_TYPES,
    maxMb: 5,
    label: "Book cover",
  },
  "board:photo": {
    bucket: "covers",
    table: "editorial_board_members",
    column: "photo_path",
    folder: "board",
    types: IMAGE_TYPES,
    maxMb: 5,
    label: "Photo",
  },
} as const;

export type AssetSlotKey = keyof typeof ASSET_SLOTS;

export const slotOf = (key: AssetSlotKey) => key.split(":")[1];
export const entityOf = (key: AssetSlotKey) => key.split(":")[0] as AssetEntity;
/** book_reviews is keyed by article_id. */
export const keyColumn = (key: AssetSlotKey) => (entityOf(key) === "book_review" ? "article_id" : "id");

/** Public URL of a file in a public bucket (covers, published). */
export function publicFileUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
