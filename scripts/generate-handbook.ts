// Writes docs/EDITORS_HANDBOOK.md from src/content/handbook.ts. Run: npm run handbook:generate
import { writeFileSync } from "node:fs";
import { handbookMarkdown } from "../src/lib/handbook";

writeFileSync(new URL("../docs/EDITORS_HANDBOOK.md", import.meta.url), handbookMarkdown());
console.log("Wrote docs/EDITORS_HANDBOOK.md");
