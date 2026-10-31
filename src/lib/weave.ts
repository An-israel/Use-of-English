/**
 * Geometry for the JHTS weave: an Akwete-inspired diamond lattice where two
 * families of diagonal threads interlace (over/under) like warp and weft.
 *
 * Lines "/" satisfy x + y = k·s and lines "\" satisfy x − y = m·s. They cross
 * at lattice points (k, m); the "/" thread passes over when k + m is even, so
 * every thread alternates over/under along its length.
 *
 * Pure and deterministic so the same seed always yields the same pattern —
 * shared by <Weave />, <IssueCover /> and the OG image renderer.
 */

export type ThreadLine = {
  /** SVG path data for a single straight thread */
  d: string;
  /** Length in user units (for draw-on animation) */
  length: number;
  /** "/" or "\" family */
  dir: "rise" | "fall";
  /** Index into the colour list */
  colour: number;
  /** stroke-dasharray that produces the over/under gaps */
  dash: string;
};

export type Lozenge = { cx: number; cy: number; r: number; colour: number; rings: number };

export type WeaveGeometry = {
  width: number;
  height: number;
  lines: ThreadLine[];
  lozenges: Lozenge[];
};

/** Small, fast, seedable PRNG (mulberry32). */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable integer seed from arbitrary parts, e.g. seedFrom(volume, issue). */
export function seedFrom(...parts: Array<string | number>): number {
  let h = 2166136261;
  for (const ch of parts.join("·")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type WeaveOptions = {
  width: number;
  height: number;
  /** Cell size in user units; smaller is denser */
  cell: number;
  /** Width of the over/under gap, as a fraction of the cell */
  gap?: number;
  /** Number of colours available; colour indices are assigned in warp stripes */
  colours?: number;
  /** Fraction of diamond cells that receive a nested lozenge (0–1) */
  lozengeDensity?: number;
  seed?: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function weaveGeometry({
  width,
  height,
  cell: s,
  gap = 0.14,
  colours = 1,
  lozengeDensity = 0,
  seed = 1,
}: WeaveOptions): WeaveGeometry {
  const rand = prng(seed);
  const d = s / Math.SQRT2; // distance between consecutive crossings on a thread
  const g = Math.min(gap * s, d * 0.6);
  const dash = `${r2(d - g / 2)} ${r2(g)} ${r2(d - g / 2)} 0`;

  // Warp stripes: a seeded repeating colour rhythm, mostly the first colour.
  const stripe: number[] = [];
  const stripeLen = 5 + Math.floor(rand() * 4);
  for (let i = 0; i < stripeLen; i++) {
    stripe.push(colours > 1 && rand() < 0.28 ? 1 + Math.floor(rand() * (colours - 1)) : 0);
  }

  const lines: ThreadLine[] = [];
  const kMax = Math.ceil((width + height) / s) + 1;

  // "/" threads: x + y = k·s. Start at a crossing with k + m even (over) at or
  // beyond the left/top edge so the dash rhythm lines up with the crossings.
  for (let k = 0; k <= kMax; k++) {
    const c = k * s;
    // crossing x = (k + m)·s/2; pick m so x ≤ max(0, c − height) and k + m even
    const xMin = Math.max(0, c - height);
    let m = Math.floor((2 * xMin) / s) - k;
    if ((k + m) % 2 !== 0) m -= 1;
    const x0 = ((k + m) * s) / 2;
    const x1 = Math.min(c, width) + s;
    const y0 = c - x0;
    const y1 = c - x1;
    const length = Math.SQRT2 * (x1 - x0);
    lines.push({
      d: `M${r2(x0)} ${r2(y0)}L${r2(x1)} ${r2(y1)}`,
      length: r2(length),
      dir: "rise",
      colour: stripe[k % stripe.length],
      dash,
    });
  }

  // "\" threads: x − y = m·s. Start at a crossing with k + m odd (this thread over).
  const mMin = -Math.ceil(height / s) - 1;
  const mMax = Math.ceil(width / s) + 1;
  for (let m = mMin; m <= mMax; m++) {
    const c = m * s;
    const xMin = Math.max(0, c);
    let k = Math.floor((2 * xMin) / s) - m;
    if ((k + m) % 2 === 0) k -= 1;
    const x0 = ((k + m) * s) / 2;
    const x1 = Math.min(width, c + height) + s;
    const length = Math.SQRT2 * (x1 - x0);
    lines.push({
      d: `M${r2(x0)} ${r2(x0 - c)}L${r2(x1)} ${r2(x1 - c)}`,
      length: r2(length),
      dir: "fall",
      colour: stripe[(m - mMin) % stripe.length],
      dash,
    });
  }

  // Nested lozenges sit in the diamond cells, centred between crossings.
  const lozenges: Lozenge[] = [];
  if (lozengeDensity > 0) {
    for (let y = 0; y <= height + s; y += s / 2) {
      const row = Math.round((2 * y) / s);
      for (let x = row % 2 === 0 ? s / 2 : 0; x <= width + s; x += s) {
        if (rand() < lozengeDensity) {
          lozenges.push({
            cx: r2(x),
            cy: r2(y),
            r: r2(s * (0.18 + rand() * 0.12)),
            colour: colours > 1 ? Math.floor(rand() * colours) : 0,
            rings: 1 + Math.floor(rand() * 2),
          });
        }
      }
    }
  }

  return { width, height, lines, lozenges };
}

/** Path for a diamond (rhombus) of "radius" r centred at (cx, cy). */
export function diamondPath(cx: number, cy: number, r: number) {
  return `M${r2(cx)} ${r2(cy - r)}L${r2(cx + r)} ${r2(cy)}L${r2(cx)} ${r2(cy + r)}L${r2(cx - r)} ${r2(cy)}Z`;
}

/* ------------------------------------------------------------------ */
/* Issue covers                                                        */
/* ------------------------------------------------------------------ */

/** Season colour for each quarterly issue month (1-indexed month). */
export function seasonFor(month: number): { ground: string; thread: string; accent: string; name: string } {
  if (month <= 3) return { name: "harmattan", ground: "#0F3B2E", thread: "#C8962E", accent: "#E9DCC0" };
  if (month <= 6) return { name: "rains", ground: "#2D3561", thread: "#C8962E", accent: "#E7D7C9" };
  if (month <= 9) return { name: "harvest", ground: "#7A2F1D", thread: "#E1B65A", accent: "#F1E3CC" };
  return { name: "festival", ground: "#15130F", thread: "#C8962E", accent: "#B4472B" };
}

export type CoverDesign = {
  cell: number;
  motifRings: number;
  motifX: number;
  motifY: number;
  motifR: number;
  bandY: number;
  seed: number;
};

/** Deterministic design choices for a cover, seeded by volume and issue. */
export function coverDesign(volume: number, issue: number): CoverDesign {
  const seed = seedFrom("jhts-cover", volume, issue);
  const rand = prng(seed);
  return {
    seed,
    cell: [34, 40, 46, 52][Math.floor(rand() * 4)],
    motifRings: 3 + Math.floor(rand() * 4),
    motifX: 0.3 + rand() * 0.4,
    motifY: 0.38 + rand() * 0.14,
    motifR: 0.2 + rand() * 0.1,
    bandY: 0.62 + rand() * 0.06,
  };
}

/* ------------------------------------------------------------------ */
/* Cover lattice as a standalone SVG file                              */
/* ------------------------------------------------------------------ */

export const COVER_W = 600;
export const COVER_H = 800;
/** Bump when the lattice design changes, so cached files are replaced. */
export const COVER_LATTICE_VERSION = 1;

/** Path of the cached lattice file for a cover (served by app/covers/[file]). */
export const coverLatticePath = (volume: number, issue: number, month: number) =>
  `/covers/lattice-v${COVER_LATTICE_VERSION}-${volume}-${issue}-${month}.svg`;

/**
 * The cover's woven lattice (hundreds of paths) as an SVG document. Covers
 * reference it as an image instead of inlining it, so pages stay small, the
 * browser caches it, and the cover's lettering still uses the site's fonts.
 */
export function coverLatticeSvg(volume: number, issue: number, month: number): string {
  const season = seasonFor(month);
  const design = coverDesign(volume, issue);
  const geo = weaveGeometry({
    width: COVER_W,
    height: COVER_H,
    cell: design.cell,
    colours: 2,
    lozengeDensity: 0.08,
    seed: design.seed,
  });
  const colours = [season.thread, season.accent];
  const groups = colours
    .map(
      (c, ci) =>
        `<g stroke="${c}" opacity="${ci === 0 ? 1 : 0.55}">${geo.lines
          .filter((l) => l.colour === ci)
          .map((l) => `<path d="${l.d}" stroke-dasharray="${l.dash}"/>`)
          .join("")}</g>`,
    )
    .join("");
  const lozenges = geo.lozenges
    .map((z) => `<path d="${diamondPath(z.cx, z.cy, z.r)}" stroke="${season.accent}" opacity="0.7"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COVER_W} ${COVER_H}" width="${COVER_W}" height="${COVER_H}"><g opacity="0.42" fill="none" stroke-width="1.25">${groups}${lozenges}</g></svg>`;
}

/* ------------------------------------------------------------------ */
/* Static weaves as cached mask files                                  */
/* ------------------------------------------------------------------ */

export type WeaveMaskSpec = {
  width: number;
  height: number;
  cell: number;
  colours: number;
  /** Lozenge density 0–1 */
  lozenges: number;
  strokeWidth: number;
  seed: number;
  /** Which colour's threads this file holds */
  colour: number;
};

const MASK_FILE = /^w(\d{2,4})-h(\d{2,4})-c(\d{1,3})-n(\d)-l(\d{1,3})-s(\d{1,3})-r(\d{1,6})-k(\d)\.svg$/;

/** File name for one colour layer of a static weave (served by app/weave/[file]). */
export function weaveMaskFile(s: WeaveMaskSpec): string {
  return `w${s.width}-h${s.height}-c${s.cell}-n${s.colours}-l${Math.round(s.lozenges * 100)}-s${Math.round(s.strokeWidth * 100)}-r${s.seed}-k${s.colour}.svg`;
}

/** Parse and bound-check a mask file name; null if it isn't one we'd generate. */
export function parseWeaveMaskFile(file: string): WeaveMaskSpec | null {
  const m = MASK_FILE.exec(file);
  if (!m) return null;
  const [width, height, cell, colours, loz, stroke, seed, colour] = m.slice(1).map(Number);
  const ok =
    width >= 100 &&
    width <= 2400 &&
    height >= 100 &&
    height <= 2400 &&
    cell >= 12 &&
    cell <= 200 &&
    colours >= 1 &&
    colours <= 4 &&
    colour < colours &&
    loz <= 100 &&
    stroke >= 25 &&
    stroke <= 400;
  return ok ? { width, height, cell, colours, lozenges: loz / 100, strokeWidth: stroke / 100, seed, colour } : null;
}

/**
 * One colour's threads (and lozenges) of a weave, drawn in white as an SVG
 * document for <Weave /> to use as a mask. The page paints the colour, so
 * themes and CSS variables still apply, while the paths are fetched once and
 * cached.
 */
export function weaveMaskSvg(s: WeaveMaskSpec): string {
  const geo = weaveGeometry({
    width: s.width,
    height: s.height,
    cell: s.cell,
    colours: s.colours,
    lozengeDensity: s.lozenges,
    seed: s.seed,
  });
  const lines = geo.lines
    .filter((l) => l.colour === s.colour)
    .map((l) => `<path d="${l.d}" stroke-dasharray="${l.dash}"/>`)
    .join("");
  const lozenges = geo.lozenges
    .filter((z) => z.colour === s.colour)
    .flatMap((z) =>
      Array.from({ length: z.rings }, (_, r) => `<path d="${diamondPath(z.cx, z.cy, z.r * (1 - r * 0.45))}"/>`),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s.width} ${s.height}" width="${s.width}" height="${s.height}"><g fill="none" stroke="#fff" stroke-width="${s.strokeWidth}">${lines}${lozenges}</g></svg>`;
}
