import { describe, expect, it } from "vitest";
import { formatDate, formatNaira, joinNames } from "@/lib/format";

describe("format", () => {
  it("formats naira from kobo", () => {
    expect(formatNaira(500_000)).toBe("₦5,000");
    expect(formatNaira(2_000_000)).toBe("₦20,000");
  });
  it("formats dates in Lagos time", () => expect(formatDate("2027-01-15T23:59:00+01:00")).toBe("15 January 2027"));
  it("joins names", () => {
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
  });
});
