import { z } from "zod";

/** Shared rules for the submission form (client hints and server checks). */

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const PDF = "application/pdf";

export const FILE_KINDS = {
  manuscript: {
    label: "Anonymised manuscript",
    required: true,
    types: [DOCX],
    hint: "Word (.docx). Remove all author names and identifying details.",
  },
  title_page: {
    label: "Title page",
    required: true,
    types: [DOCX],
    hint: "Word (.docx) with the title, all authors, affiliations and acknowledgements.",
  },
  cover_letter: { label: "Cover letter", required: false, types: [DOCX, PDF], hint: "Optional. Word (.docx) or PDF." },
  revision: { label: "Revised manuscript", required: false, types: [DOCX], hint: "Word (.docx), anonymised." },
} as const;

export type UploadKind = keyof typeof FILE_KINDS;

export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const detailsSchema = z.object({
  title: z.string().trim().min(5, "Add a title.").max(300),
  type: z.enum(["research_article", "theoretical_paper", "critical_review", "book_review"]),
  categoryId: z.uuid("Choose a subject area."),
  abstract: z
    .string()
    .trim()
    .refine((a) => countWords(a) >= 150 && countWords(a) <= 250, "The abstract must be 150 to 250 words."),
  keywords: z
    .array(z.string().trim().min(2).max(60))
    .min(3, "Add at least 3 keywords.")
    .max(6, "Use at most 6 keywords."),
  citationStyle: z.enum(["apa7", "mla9"], { error: "Choose APA 7th or MLA 9th." }),
});

export const authorSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(200),
  affiliation: z.string().trim().max(300),
  email: z.email("Valid email required.").max(320),
  orcid: z
    .string()
    .trim()
    .transform((s) => s.replace(/^https?:\/\/orcid\.org\//, ""))
    .refine((s) => s === "" || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(s), "ORCID looks like 0000-0002-1825-0097."),
  isCorresponding: z.boolean(),
});

export const authorsSchema = z
  .array(authorSchema)
  .min(1, "Add at least one author.")
  .max(20)
  .refine((a) => a.filter((x) => x.isCorresponding).length === 1, "Choose one corresponding author.");

export const DECLARATIONS = [
  ["original", "The manuscript is my (our) original work and has not been published before."],
  ["notElsewhere", "It is not under review with any other journal."],
  ["allAgree", "All the listed authors have seen and agree to this submission."],
  ["guidelines", "The manuscript follows the author guidelines and is anonymised for double-blind review."],
  [
    "fees",
    "I accept the fee policy. Payment of fees does not guarantee acceptance; all editorial decisions are based solely on scholarly merit.",
  ],
] as const;

/** A storage-safe file name: letters, digits, dot, dash and underscore. */
export function safeFileName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/_+/g, "_");
  return base.slice(-80) || "file";
}

/** Files the editorial office adds to a submission. */
export const STAFF_FILE_KINDS = {
  plagiarism_report: {
    label: "Plagiarism report",
    types: [PDF, DOCX],
    visibleToAuthor: false,
    hint: "PDF or Word. Never shown to the author.",
  },
  reviewer_comments: {
    label: "Reviewer comments for the author",
    types: [PDF, DOCX],
    visibleToAuthor: true,
    hint: "PDF or Word, anonymised. The author can download it.",
  },
} as const;

export type StaffUploadKind = keyof typeof STAFF_FILE_KINDS;

export const RECOMMENDATION_LABEL = {
  accept: "Accept",
  minor_revisions: "Minor revisions",
  major_revisions: "Major revisions",
  reject: "Reject",
} as const;
export type Recommendation = keyof typeof RECOMMENDATION_LABEL;

export const REVIEW_STATUS_LABEL = {
  invited: "Invited",
  accepted: "Reviewing",
  declined: "Declined",
  submitted: "Review submitted",
  cancelled: "Cancelled",
} as const;
