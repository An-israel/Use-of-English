import { describe, expect, it } from "vitest";
import { coverDesign, prng, seedFrom, weaveGeometry } from "@/lib/weave";

describe("weave geometry", () => {
  it("is deterministic for a seed", () => {
    const a = weaveGeometry({ width: 600, height: 800, cell: 40, colours: 2, lozengeDensity: 0.1, seed: 5 });
    const b = weaveGeometry({ width: 600, height: 800, cell: 40, colours: 2, lozengeDensity: 0.1, seed: 5 });
    expect(a).toEqual(b);
  });
  it("covers the canvas with both thread families", () => {
    const g = weaveGeometry({ width: 600, height: 800, cell: 40 });
    expect(g.lines.some((l) => l.dir === "rise")).toBe(true);
    expect(g.lines.some((l) => l.dir === "fall")).toBe(true);
    expect(g.lines.length).toBeGreaterThan((600 + 800) / 40);
  });
  it("gives every issue a different but stable cover", () => {
    expect(coverDesign(1, 2)).toEqual(coverDesign(1, 2));
    expect(coverDesign(1, 2)).not.toEqual(coverDesign(1, 3));
  });
  it("prng stays in [0, 1)", () => {
    const r = prng(seedFrom("x"));
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
