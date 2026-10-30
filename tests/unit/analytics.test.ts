import { describe, expect, it } from "vitest";
import { dailySeries, topArticles, weekly } from "@/lib/analytics";

const r = (day: string, article_id: string, views: number, pdf = 0, docx = 0) => ({
  day,
  article_id,
  views,
  downloads_pdf: pdf,
  downloads_docx: docx,
});

describe("analytics", () => {
  it("fills every day and sums articles", () => {
    expect(
      dailySeries(
        [r("2027-03-02", "a", 3, 1), r("2027-03-02", "b", 2, 0, 1), r("2027-02-01", "a", 9)],
        "2027-03-01",
        "2027-03-03",
      ),
    ).toEqual([
      { day: "2027-03-01", views: 0, downloads: 0 },
      { day: "2027-03-02", views: 5, downloads: 2 },
      { day: "2027-03-03", views: 0, downloads: 0 },
    ]);
  });
  it("groups long ranges into weeks", () => {
    const days = dailySeries([r("2027-03-01", "a", 1), r("2027-03-08", "a", 2)], "2027-03-01", "2027-03-10");
    expect(weekly(days)).toEqual([
      { day: "2027-03-01", views: 1, downloads: 0 },
      { day: "2027-03-08", views: 2, downloads: 0 },
    ]);
  });
  it("ranks articles by views, then downloads", () => {
    expect(
      topArticles([r("d", "a", 2, 1), r("d", "b", 5), r("e", "a", 3), r("d", "c", 5, 2)]).map((t) => t.id),
    ).toEqual(["c", "a", "b"]);
  });
});
