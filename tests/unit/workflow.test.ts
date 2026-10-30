import { describe, expect, it } from "vitest";
import { canWithdraw, editorTransitions, invitableRoles, statusAfterSubmit, timelinePosition } from "@/lib/workflow";

describe("submission workflow", () => {
  it("sends drafts to the fee step only when fees are on", () => {
    expect(statusAfterSubmit(true)).toBe("awaiting_review_fee");
    expect(statusAfterSubmit(false)).toBe("submitted");
    expect(statusAfterSubmit(true, true)).toBe("submitted");
  });
  it("skips the publication fee step when fees are off", () => {
    expect(editorTransitions("under_peer_review", true)).toContain("accepted_awaiting_fee");
    expect(editorTransitions("under_peer_review", false)).toContain("in_production");
    expect(editorTransitions("under_peer_review", false)).not.toContain("accepted_awaiting_fee");
  });
  it("never moves a closed submission", () => {
    expect(editorTransitions("published", true)).toEqual([]);
    expect(editorTransitions("rejected", true)).toEqual([]);
  });
  it("allows withdrawal only before acceptance", () => {
    expect(canWithdraw("under_peer_review")).toBe(true);
    expect(canWithdraw("accepted_awaiting_fee")).toBe(false);
    expect(canWithdraw("withdrawn")).toBe(false);
  });
  it("places side statuses on the timeline", () => {
    expect(timelinePosition("revisions_requested")).toBe(timelinePosition("under_peer_review"));
    expect(timelinePosition("published")).toBe(6);
  });
});

describe("invitations", () => {
  it("only Super Admins invite staff; editors invite reviewers", () => {
    expect(invitableRoles("super_admin")).toContain("finance_officer");
    expect(invitableRoles("editor")).toEqual(["reviewer"]);
    expect(invitableRoles("author")).toEqual([]);
    expect(invitableRoles("finance_officer")).toEqual([]);
  });
});
