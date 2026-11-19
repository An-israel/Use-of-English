// Dependency audit for CI: fails on any high or critical advisory in production
// dependencies, except those listed in .audit-allowlist.json until their expiry
// date. An expired entry fails again, so an exception can't be forgotten.
// Run: node scripts/audit.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const allow = JSON.parse(readFileSync(new URL("../.audit-allowlist.json", import.meta.url), "utf8"));
let report;
try {
  report = execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", maxBuffer: 64 << 20 });
} catch (err) {
  // npm audit exits non-zero when it finds anything; the JSON is still on stdout.
  report = err.stdout;
}
const { vulnerabilities = {} } = JSON.parse(report);
const RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
const today = new Date().toISOString().slice(0, 10);

const advisories = new Map();
for (const [pkg, v] of Object.entries(vulnerabilities))
  for (const via of v.via)
    if (typeof via === "object") {
      const id = via.url?.split("/").pop() ?? String(via.source);
      const a = advisories.get(id) ?? { id, title: via.title, severity: via.severity, packages: new Set() };
      a.packages.add(pkg);
      advisories.set(id, a);
    }

let failed = false;
for (const a of advisories.values()) {
  if (RANK[a.severity] < RANK.high) continue;
  const entry = allow[a.id];
  const where = [...a.packages].join(", ");
  if (entry && entry.until >= today) {
    console.log(`allowed until ${entry.until}: ${a.id} (${a.severity}) ${a.title} in ${where}. ${entry.reason}`);
    continue;
  }
  failed = true;
  console.error(`${entry ? `EXPIRED ${entry.until}: ` : ""}${a.id} (${a.severity}) ${a.title} in ${where}`);
}
if (failed) process.exit(1);
console.log("No high or critical advisories outside the allowlist.");
