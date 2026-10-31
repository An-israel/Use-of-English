/**
 * Generates the static brand files from the <Emblem /> component, so the
 * favicon, home-screen icons, email and PDF images always match the site's
 * logo. Run after changing the emblem: npm run brand:generate
 *
 *   public/brand/emblem.svg        emblem with the JHTS wordmark
 *   public/brand/emblem-mark.svg   emblem without lettering (small sizes)
 *   public/brand/emblem-512.png    for emails, PDFs and social images
 *   src/app/icon.svg               browser tab icon
 *   src/app/apple-icon.png         phone home-screen icon (180 px)
 *   src/app/favicon.ico            16, 32 and 48 px, for browsers that ask for it
 *   public/brand/icon-192.png, icon-512.png   web app manifest icons
 */
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { Emblem } from "../src/components/brand/Emblem";

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";

function svg(wordmark: boolean): string {
  const markup = renderToStaticMarkup(<Emblem wordmark={wordmark} title="JHTS" />)
    // Standalone files can't see the page's font variables.
    .replace(/font-family:var\(--font-display\), Georgia, serif/g, `font-family:${SERIF}`)
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${markup}\n`;
}

/** An .ico holding PNG images (supported by every current browser). */
function ico(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e);
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

async function main() {
  const full = svg(true);
  const mark = svg(false);
  writeFileSync("public/brand/emblem.svg", full);
  writeFileSync("public/brand/emblem-mark.svg", mark);
  writeFileSync("src/app/icon.svg", mark);

  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  const page = await browser.newPage();
  const render = async (source: string, size: number, background = "transparent") => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><head><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@800&display=block" rel="stylesheet"></head>` +
        `<body style="margin:0;background:${background}"><div style="width:${size}px;height:${size}px">${source.replace(/<\?xml[^>]*>/, "").replace("<svg ", `<svg width="${size}" height="${size}" `)}</div></body></html>`,
      { waitUntil: "networkidle" },
    );
    return page.screenshot({ omitBackground: background === "transparent", clip: { x: 0, y: 0, width: size, height: size } });
  };
  writeFileSync("public/brand/emblem-512.png", await render(full, 512));
  writeFileSync("public/brand/icon-512.png", await render(mark, 512, "#faf7ee"));
  writeFileSync("public/brand/icon-192.png", await render(mark, 192, "#faf7ee"));
  writeFileSync("src/app/apple-icon.png", await render(mark, 180, "#faf7ee"));
  const small = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await render(mark, size) })));
  writeFileSync("src/app/favicon.ico", ico(small));
  await browser.close();
  console.log("Brand files written.");
}
main();
