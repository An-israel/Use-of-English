// WCAG contrast check for the JHTS palette (brief 3.2). Run: node scripts/contrast.mjs
const hex = (h) =>
  h
    .replace("#", "")
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255);
const lum = (h) => {
  const [r, g, b] = hex(h).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const light = { ivory: "#F6F1E7", paper: "#FFFDF8" };
const dark = { bg: "#12110E", surface: "#1B1915" };
const pairs = [
  ["light", "ink text", "#15130F", light, 4.5],
  ["light", "stone (secondary text)", "#6F675C", light, 4.5],
  ["light", "forest (links)", "#0F3B2E", light, 4.5],
  ["light", "terracotta (accent text)", "#B4472B", light, 4.5],
  ["light", "indigo-dye", "#2D3561", light, 4.5],
  ["light", "ochre (decorative only)", "#C8962E", light, 1.5],
  ["light", "thread-text (ochre for text)", "#86621A", light, 4.5],
  ["light", "paper on forest (buttons)", "#FFFDF8", { forest: "#0F3B2E", "forest-700": "#145240" }, 4.5],
  ["light", "ochre on forest band", "#C8962E", { forest: "#0F3B2E" }, 4.5],
  ["light", "ochre on ink footer", "#C8962E", { ink: "#15130F" }, 4.5],
  ["light", "footer muted on ink", "#B3AA9B", { ink: "#15130F" }, 4.5],
  ...[
    ["language", "#2D3561"],
    ["literature", "#7A3B2A"],
    ["culture", "#0F5A46"],
    ["communication", "#7A5A12"],
    ["translation", "#5B3A63"],
    ["philosophy", "#5A4A36"],
    ["education", "#2F5563"],
    ["other", "#6B4A3D"],
  ].map(([n, c]) => ["light", `thread-${n}`, c, light, 4.5]),
  ["dark", "text", "#ECE5D6", dark, 4.5],
  ["dark", "muted", "#A89F90", dark, 4.5],
  ["dark", "brand", "#6FB595", dark, 4.5],
  ["dark", "accent", "#E08466", dark, 4.5],
  ["dark", "thread-text", "#D9AB4C", dark, 4.5],
  ["dark", "button text on brand", "#0C1A14", { brand: "#6FB595" }, 4.5],
  ...[
    ["language", "#9AA6DD"],
    ["literature", "#E0997F"],
    ["culture", "#6FB595"],
    ["communication", "#D9AB4C"],
    ["translation", "#C39CCC"],
    ["philosophy", "#C9B392"],
    ["education", "#8FBCCC"],
    ["other", "#D1A491"],
  ].map(([n, c]) => ["dark", `thread-${n}`, c, dark, 4.5]),
];
let fail = 0;
for (const [mode, name, fg, bgs, min] of pairs) {
  for (const [bn, bg] of Object.entries(bgs)) {
    const r = ratio(fg, bg);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  ${mode.padEnd(5)} ${name} on ${bn}`);
  }
}
process.exit(fail ? 1 : 0);
