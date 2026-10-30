/**
 * Submission status workflow (brief section 8). Editors run review on the
 * site; these rules decide which moves are allowed and how each status reads
 * to authors.
 */

export const STATUSES = [
  "draft",
  "awaiting_review_fee",
  "submitted",
  "under_screening",
  "plagiarism_check",
  "under_peer_review",
  "revisions_requested",
  "revised_received",
  "accepted_awaiting_fee",
  "in_production",
  "published",
  "rejected",
  "withdrawn",
] as const;

export type SubmissionStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft",
  awaiting_review_fee: "Awaiting review fee",
  submitted: "Submitted",
  under_screening: "Under screening",
  plagiarism_check: "Plagiarism check",
  under_peer_review: "Under peer review",
  revisions_requested: "Revisions requested",
  revised_received: "Revised manuscript received",
  accepted_awaiting_fee: "Accepted, awaiting publication fee",
  in_production: "In production",
  published: "Published",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** What the author should do next, if anything. */
export const AUTHOR_NEXT_STEP: Partial<Record<SubmissionStatus, string>> = {
  draft: "Finish and submit your manuscript.",
  awaiting_review_fee: "Pay the review fee to send your manuscript to the editors.",
  revisions_requested: "Read the editors’ comments and upload a revised manuscript.",
  accepted_awaiting_fee: "Pay the publication fee to move your article into production.",
};

/** The main path, used to draw the author's progress timeline. */
export const TIMELINE: SubmissionStatus[] = [
  "submitted",
  "under_screening",
  "plagiarism_check",
  "under_peer_review",
  "accepted_awaiting_fee",
  "in_production",
  "published",
];

export const CLOSED: SubmissionStatus[] = ["published", "rejected", "withdrawn"];

const EDITOR_MOVES: Partial<Record<SubmissionStatus, SubmissionStatus[]>> = {
  submitted: ["under_screening", "rejected"],
  under_screening: ["plagiarism_check", "rejected"],
  plagiarism_check: ["under_peer_review", "rejected"],
  under_peer_review: ["revisions_requested", "accepted_awaiting_fee", "rejected"],
  revisions_requested: ["revised_received", "rejected"],
  revised_received: ["under_peer_review", "revisions_requested", "accepted_awaiting_fee", "rejected"],
  accepted_awaiting_fee: ["in_production"],
  in_production: ["published"],
};

/**
 * Statuses an editor may move a submission to. When fees are off, accepted
 * papers go straight to production (decision recorded 30 October 2026).
 */
export function editorTransitions(from: SubmissionStatus, feesEnabled: boolean): SubmissionStatus[] {
  const moves = EDITOR_MOVES[from] ?? [];
  if (!feesEnabled) return moves.map((m) => (m === "accepted_awaiting_fee" ? "in_production" : m));
  return moves;
}

/** Where a newly completed draft goes: to the fee step, or straight to the editors. */
export function statusAfterSubmit(feesEnabled: boolean, waived = false): SubmissionStatus {
  return feesEnabled && !waived ? "awaiting_review_fee" : "submitted";
}

/** Authors may withdraw only before acceptance. */
export function canWithdraw(status: SubmissionStatus): boolean {
  return !CLOSED.includes(status) && !["accepted_awaiting_fee", "in_production"].includes(status);
}

/** Index on the timeline (side statuses map to where they sit on the path). */
export function timelinePosition(status: SubmissionStatus): number {
  const map: Partial<Record<SubmissionStatus, SubmissionStatus>> = {
    draft: "submitted",
    awaiting_review_fee: "submitted",
    revisions_requested: "under_peer_review",
    revised_received: "under_peer_review",
  };
  return TIMELINE.indexOf(map[status] ?? status);
}

/* ------------------------------------------------------------------ roles */

export const ROLES = ["super_admin", "editor", "book_review_editor", "finance_officer", "reviewer", "author"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  editor: "Editor",
  book_review_editor: "Book Review Editor",
  finance_officer: "Finance Officer",
  reviewer: "Reviewer",
  author: "Author",
};

/** Roles that work in the admin dashboard. */
export const STAFF_ROLES: Role[] = ["super_admin", "editor", "book_review_editor", "finance_officer"];

/** Which roles a person may hand out by invitation. */
export function invitableRoles(by: Role): Role[] {
  if (by === "super_admin") return ["super_admin", "editor", "book_review_editor", "finance_officer", "reviewer"];
  if (by === "editor" || by === "book_review_editor") return ["reviewer"];
  return [];
}
