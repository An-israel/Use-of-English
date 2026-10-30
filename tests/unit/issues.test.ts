import { describe, expect, it } from "vitest";
import {
  defaultMonthForIssue,
  issueLabel,
  issueLabelShort,
  issuePath,
  issueRunningHead,
  pageRange,
} from "@/lib/issues";

describe("issue labels", () => {
  const ref = { volume: 1, number: 2, month: 6, year: 2027 };
  it("formats the full label", () => expect(issueLabel(ref)).toBe("Volume 1, Issue 2 (June 2027)"));
  it("formats the short label", () => expect(issueLabelShort(ref)).toBe("Vol. 1 No. 2 (2027)"));
  it("formats the running head", () => expect(issueRunningHead(ref)).toBe("Volume 1 · Issue 2 · June 2027"));
  it("builds the path", () => expect(issuePath(ref)).toBe("/issues/1/2"));
  it("pre-fills quarterly months", () => expect([1, 2, 3, 4].map(defaultMonthForIssue)).toEqual([3, 6, 9, 12]));
  it("formats page ranges", () => {
    expect(pageRange(1, 22)).toBe("pp. 1–22");
    expect(pageRange(7, 7)).toBe("p. 7");
    expect(pageRange(null, null)).toBe("");
  });
  it("rejects invalid months", () => expect(() => issueLabel({ ...ref, month: 13 })).toThrow(RangeError));
});
