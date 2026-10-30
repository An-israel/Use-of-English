// Design self-review screenshots (brief section 3.6): 390, 1024 and 1440 px.
// Usage: node scripts/screenshots.mjs [baseUrl] [outDir]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "screenshots";
mkdirSync(out, { recursive: true });

const pages = [
  { name: "home", path: "/" },
  { name: "404", path: "/this-page-does-not-exist" },
];
const widths = [390, 1024, 1440];

const browser = await chromium.launch();
try {
  for (const width of widths) {
    for (const theme of ["light", "dark"]) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: width < 600 ? 2 : 1,
        colorScheme: theme,
      });
      const page = await ctx.newPage();
      for (const p of pages) {
        if (theme === "dark" && p.name !== "home") continue;
        await page.goto(base + p.path, { waitUntil: "networkidle" });
        await page.waitForTimeout(1600); // let the weave finish drawing
        await page.screenshot({
          path: `${out}/${p.name}-${width}${theme === "dark" ? "-dark" : ""}.png`,
          fullPage: true,
        });
      }

      if (theme === "light" && width === 1440) {
        await page.goto(base + "/", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Journal", exact: true }).click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${out}/megamenu-journal-1440.png` });
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Authors", exact: true }).click();
        await page.waitForTimeout(300);
        await page.screenshot({ path: `${out}/megamenu-authors-1440.png` });
        await page.keyboard.press("Escape");
        await page.keyboard.press("Control+k");
        await page.keyboard.type("proverb");
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${out}/palette-1440.png` });
        await page.keyboard.press("Escape");
        await page.mouse.wheel(0, 900);
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${out}/header-scrolled-1440.png` });
      }
      if (theme === "light" && width === 390) {
        await page.goto(base + "/", { waitUntil: "networkidle" });
        await page.getByRole("button", { name: "Menu" }).click();
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${out}/menu-sheet-390.png` });
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
console.log(`Screenshots written to ${out}/`);
