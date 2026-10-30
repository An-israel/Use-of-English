// Copies the pdf.js worker that matches the installed react-pdf into public/,
// so the in-page reader loads it from our own origin (CSP: worker-src 'self').
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pdfjs = dirname(require.resolve("pdfjs-dist/package.json", { paths: [require.resolve("react-pdf")] }));
mkdirSync("public", { recursive: true });
copyFileSync(join(pdfjs, "build", "pdf.worker.min.mjs"), join("public", "pdf.worker.min.mjs"));
console.log("pdf.js worker copied to public/pdf.worker.min.mjs");
