import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Generated Open Graph images (brief section 12): the journal's cream paper, a
 * woven forest band carrying the emblem, and the title in Playfair Display.
 * 1200 × 630, the size every network expects.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const C = { ink: "#1C211D", ivory: "#FAF7EE", forest: "#14452F", ochre: "#E1B521", stone: "#6A6A5C", line: "#E5DFCD" };

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }[]> | null = null;
function loadFonts() {
  const read = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));
  fonts ??= Promise.all([
    read("playfair-display-latin-400-normal.woff"),
    read("playfair-display-latin-700-normal.woff"),
    read("source-sans-3-latin-400-normal.woff"),
    read("source-sans-3-latin-600-normal.woff"),
  ]).then(([p4, p7, s4, s6]) => [
    { name: "Playfair Display", data: p4, weight: 400, style: "normal" },
    { name: "Playfair Display", data: p7, weight: 700, style: "normal" },
    { name: "Source Sans 3", data: s4, weight: 400, style: "normal" },
    { name: "Source Sans 3", data: s6, weight: 600, style: "normal" },
  ]);
  return fonts;
}

/** The emblem as a data URL (the PNG drawn by `npm run brand:generate`). */
let emblem: Promise<string> | null = null;
function loadEmblem() {
  emblem ??= readFile(join(process.cwd(), "public/brand/emblem-512.png")).then(
    (b) => `data:image/png;base64,${b.toString("base64")}`,
  );
  return emblem;
}

/** The Akwete-style lozenge lattice used on covers, drawn for the OG band. */
function Weave({ width, height }: { width: number; height: number }) {
  const cell = 46;
  const lines: string[] = [];
  for (let x = -height; x < width + height; x += cell) {
    lines.push(`M${x},0L${x + height},${height}`, `M${x + height},0L${x},${height}`);
  }
  const lozenges: string[] = [];
  for (let y = cell; y < height; y += cell * 3)
    for (let x = cell; x < width; x += cell * 2)
      lozenges.push(`M${x},${y - 9}L${x + 9},${y}L${x},${y + 9}L${x - 9},${y}Z`);
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: 0, top: 0 }}
    >
      <path d={lines.join("")} stroke={C.ochre} strokeOpacity="0.28" strokeWidth="1.5" fill="none" />
      <path d={lozenges.join("")} fill={C.ochre} fillOpacity="0.55" />
    </svg>
  );
}

export async function ogCard({
  kicker,
  title,
  meta,
  footer = "Journal of Humanities and Transcultural Studies",
}: {
  kicker: string;
  title: string;
  meta?: string;
  footer?: string;
}) {
  const logo = await loadEmblem();
  const size = title.length > 110 ? 48 : title.length > 70 ? 58 : 68;
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: C.ivory, fontFamily: "Source Sans 3" }}>
      <div
        style={{
          display: "flex",
          position: "relative",
          width: 300,
          height: "100%",
          background: C.forest,
          overflow: "hidden",
        }}
      >
        <Weave width={300} height={630} />
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 40,
            top: 40,
            width: 220,
            height: 220,
            borderRadius: 110,
            background: C.ivory,
            border: `4px solid ${C.ochre}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img */}
          <img src={logo} width={212} height={212} alt="" />
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 44,
            bottom: 44,
            fontFamily: "Playfair Display",
            fontWeight: 700,
            fontSize: 64,
            color: C.ivory,
            letterSpacing: -1,
          }}
        >
          JHTS
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 72px 56px 72px" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: "#7D5F05", textTransform: "uppercase" }}>
          {kicker}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontFamily: "Playfair Display",
            fontWeight: 700,
            fontSize: size,
            lineHeight: 1.08,
            color: C.ink,
            letterSpacing: -1,
          }}
        >
          {title.length > 160 ? `${title.slice(0, 157)}…` : title}
        </div>
        {meta && <div style={{ display: "flex", marginTop: 28, fontSize: 26, color: C.stone }}>{meta}</div>}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 22,
            borderTop: `2px solid ${C.line}`,
            fontSize: 22,
            color: C.stone,
          }}
        >
          {footer}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts: await loadFonts() },
  );
}
