import { describe, expect, it } from "vitest";
import { mapLimit, matchByName } from "@/lib/concurrency";

describe("mapLimit", () => {
  it("never runs more than the limit at once and keeps order", async () => {
    let active = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5 + (n % 3) * 3));
      active--;
      if (n === 4) throw new Error("four");
      return n * 10;
    });
    expect(peak).toBe(3);
    expect(out.map((r) => (r.status === "fulfilled" ? r.value : "x"))).toEqual([10, 20, 30, "x", 50, 60, 70]);
  });
});

describe("matchByName", () => {
  const articles = [
    { slug: "code-switching-and-authority-in-nsukka-classrooms", title: "Code-Switching and Classroom Authority" },
    { slug: "hashtags-and-the-grammar-of-protest", title: "Hashtags and the Grammar of Protest" },
  ];
  it("matches files by shared words and refuses weak guesses", () => {
    expect(matchByName("JHTS_Vol1_No1_Code_Switching_final.pdf", articles)?.slug).toBe(articles[0].slug);
    expect(matchByName("grammar-of-protest (2).pdf", articles)?.slug).toBe(articles[1].slug);
    expect(matchByName("scan0001.pdf", articles)).toBeNull();
  });
});
