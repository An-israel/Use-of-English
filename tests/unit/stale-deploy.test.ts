import { describe, expect, it } from "vitest";
import { STALE_DEPLOY } from "@/lib/stale-deploy";

describe("stale deployment errors", () => {
  it.each([
    'Failed to find Server Action "7f3a". This request might be from an older or newer deployment.',
    "Server Action not found",
    "ChunkLoadError: Loading chunk 482 failed.",
    "Failed to load chunk /_next/static/chunks/abc.js",
    "Importing a module script failed.",
  ])("recognises %s", (m) => expect(STALE_DEPLOY.test(m)).toBe(true));

  it.each(["Cannot read properties of undefined (reading 'id')", "fetch failed", "relation does not exist"])(
    "leaves other errors alone: %s",
    (m) => expect(STALE_DEPLOY.test(m)).toBe(false),
  );
});
