import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Generated Open Graph images (brief section 12): the journal's paper, a
 * woven forest band and the title in Fraunces. 1200 × 630, the size every
 * network expects.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const C = { ink: "#15130F", ivory: "#F6F1E7", forest: "#0F3B2E", ochre: "#C8962E", stone: "#6F675C", line: "#E4DCCD" };

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600; style: "normal" }[]> | null = null;
function loadFonts() {
  const read = (f: string) => readFile(join(process.cwd(), "assets/fonts", f));
  fonts ??= Promise.all([
    read("fraunces-latin-400-normal.woff"),
    read("fraunces-latin-600-normal.woff"),
    read("instrument-sans-latin-400-normal.woff"),
    read("instrument-sans-latin-600-normal.woff"),
  ]).then(([f4, f6, i4, i6]) => [
    { name: "Fraunces", data: f4, weight: 400, style: "normal" },
    { name: "Fraunces", data: f6, weight: 600, style: "normal" },
    { name: "Instrument Sans", data: i4, weight: 400, style: "normal" },
    { name: "Instrument Sans", data: i6, weight: 600, style: "normal" },
  ]);
  return fonts;
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
  const size = title.length > 110 ? 48 : title.length > 70 ? 58 : 68;
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: C.ivory, fontFamily: "Instrument Sans" }}>
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
            left: 44,
            bottom: 44,
            fontFamily: "Fraunces",
            fontWeight: 600,
            fontSize: 64,
            color: "#F1E8D6",
            letterSpacing: -2,
          }}
        >
          JHTS
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "64px 72px 56px 72px" }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 3, color: "#86621A", textTransform: "uppercase" }}>
          {kicker}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontFamily: "Fraunces",
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
