import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth";

describe("safeNext (open-redirect guard)", () => {
  it("keeps same-site paths", () => expect(safeNext("/account/submissions?x=1")).toBe("/account/submissions?x=1"));
  it("rejects absolute and protocol-relative URLs", () => {
    expect(safeNext("https://evil.example")).toBe("/account");
    expect(safeNext("//evil.example")).toBe("/account");
    expect(safeNext("/\\evil.example")).toBe("/account");
  });
  it("falls back when empty", () => expect(safeNext(null, "/x")).toBe("/x"));
});
