import { describe, expect, it } from "vitest";
import { downloadName, isBot, sessionHash, surname } from "@/lib/downloads";

describe("downloads", () => {
  it("names files cleanly", () => {
    expect(
      downloadName({ format: "pdf", issue: { volume: 1, number: 2, year: 2027 }, firstAuthor: "Adaeze N. Okafor" }),
    ).toBe("JHTS_Vol1_No2_2027_Okafor.pdf");
    expect(downloadName({ format: "docx", year: 2027, firstAuthor: "Chidi Ụzọ-Eze" })).toBe(
      "JHTS_InPress_2027_Uzo-Eze.docx",
    );
    expect(downloadName({ format: "pdf", issue: { volume: 2, number: 1, year: 2028 } })).toBe("JHTS_Vol2_No1_2028.pdf");
    expect(surname("O'Neil")).toBe("ONeil");
  });
  it("filters bots and scripts but counts browsers", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(
      isBot(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0 Safari/537.36",
      ),
    ).toBe(true);
    expect(isBot(null)).toBe(true);
    expect(
      isBot(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile Safari/604.1",
      ),
    ).toBe(false);
  });
  it("hashes sessions per day without storing the address", () => {
    const a = sessionHash("102.89.1.1", "UA", "2027-03-01", "salt");
    expect(a).toHaveLength(40);
    expect(a).not.toContain("102.89");
    expect(sessionHash("102.89.1.1", "UA", "2027-03-02", "salt")).not.toBe(a);
    expect(sessionHash("102.89.1.1", "UA", "2027-03-01", "salt")).toBe(a);
  });
});
