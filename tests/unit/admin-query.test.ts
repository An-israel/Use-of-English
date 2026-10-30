import { describe, expect, it } from "vitest";
import { pageOf, range, searchTerm, withParams } from "@/lib/admin/query";

describe("admin list helpers", () => {
  it("neutralises PostgREST filter syntax in search terms", () => {
    expect(searchTerm("a,b),title.eq.x")).toBe("a b title.eq.x");
    expect(searchTerm("  %%  ")).toBeNull();
    expect(searchTerm(undefined)).toBeNull();
  });
  it("parses pages and ranges", () => {
    expect(pageOf("3")).toBe(3);
    expect(pageOf("-1")).toBe(1);
    expect(pageOf("x")).toBe(1);
    expect(range(2, 10)).toEqual([10, 19]);
  });
  it("rebuilds list URLs", () => {
    expect(withParams("/admin/s", { q: "igbo", page: "2" }, { page: null, view: "board" })).toBe(
      "/admin/s?q=igbo&view=board",
    );
  });
});
