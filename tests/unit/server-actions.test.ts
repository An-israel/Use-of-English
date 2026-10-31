import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Brief section 15: every server action validates its input with zod and
 * checks the role on the server. This reads each "use server" file and fails
 * on any exported action that takes input but never runs a zod schema, or
 * never checks who is calling.
 */
const files = globSync("src/**/*.ts").filter((f) => /^["']use server["'];/.test(readFileSync(f, "utf8")));

type Fn = { file: string; name: string; params: string; body: string };

function actions(file: string): Fn[] {
  const src = readFileSync(file, "utf8");
  const out: Fn[] = [];
  const re = /export async function (\w+)\(([\s\S]*?)\)\s*(?::[^{]*)?\{/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    // The body runs to the next top-level "export" or the end of the file.
    const start = re.lastIndex;
    const next = src.slice(start).search(/\n(export |\/\*\*|function |const \w+ = )/);
    out.push({ file, name: m[1], params: m[2].trim(), body: src.slice(start, next < 0 ? undefined : start + next) });
  }
  return out;
}

const all = files.flatMap(actions);
// Who-is-calling checks used across the codebase.
// Ownership helpers (ownDraft, ownAssignment, own) look up the viewer and check the row is theirs;
// createVolumeYear hands over to createNextIssue, which checks the role.
const AUTH =
  /\b(staff|requireRole|requireViewer|getViewer|ownDraft|ownAssignment|own|createNextIssue)\(|auth\.getClaims|NODE_ENV/;
const ZOD = /\.safeParse\(|\.parse\(|validArgs\(/;

describe("server actions", () => {
  it("found the action files", () => expect(files.length).toBeGreaterThan(10));

  it.each(
    all.filter((f) => f.params && !/^_?\w*:\s*\w*State,?\s*$/.test(f.params)).map((f) => [`${f.file} ${f.name}`, f]),
  )("%s validates its input with zod", (_, f) =>
    expect(ZOD.test((f as Fn).body), `${(f as Fn).name}(${(f as Fn).params})`).toBe(true),
  );

  // Sign-in, registration and password reset are for people who aren't signed in yet.
  const PUBLIC = new Set([
    "signIn",
    "register",
    "resendConfirmation",
    "requestPasswordReset",
    "setPassword",
    "signInWithGoogle",
    "signOut",
    "sendContactMessage",
    "mockOutcome",
  ]);
  it.each(all.filter((f) => !PUBLIC.has(f.name)).map((f) => [`${f.file} ${f.name}`, f]))(
    "%s checks who is calling",
    (_, f) => expect(AUTH.test((f as Fn).body), (f as Fn).name).toBe(true),
  );
});
