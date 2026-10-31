import AxeBuilder from "@axe-core/playwright";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * Accessibility pass (Milestone 10): an axe scan for WCAG 2.2 A and AA on every
 * kind of page, public and admin, in light and dark. Any violation fails the
 * test with the rule, the help text and the offending elements.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = () => createClient(URL_!, KEY!, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const pw = "a11y-test-password-123";
const admin = `a11y.admin.${run}@example.test`;
const author = `a11y.author.${run}@example.test`;

const publicPages = [
  "/",
  "/issues",
  "/issues/current",
  "/in-press",
  "/book-reviews",
  "/subjects",
  "/subjects/language-literature-and-linguistics",
  "/editorial-board",
  "/about",
  "/aims-and-scope",
  "/use-of-english-unit",
  "/call-for-papers",
  "/author-guidelines",
  "/fees",
  "/policies",
  "/policies/peer-review",
  "/policies/reviewer-guidelines",
  "/faq",
  "/goodbye",
  "/contact",
  "/search?q=language",
  "/login",
  "/register",
  "/forgot-password",
  "/a-page-that-does-not-exist",
];

async function scan(page: Page, label: string) {
  // The <title> is streamed in after the body; wait for it, and for entrance animations to settle.
  await expect(page).toHaveTitle(/\S/);
  await page.waitForTimeout(400);
  // The email preview is a sandboxed srcdoc frame axe can't enter; it is an email, not site UI.
  const { violations } = await new AxeBuilder({ page })
    .exclude("iframe[srcdoc]")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const report = violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `   ${n.target.join(" ")}  ${n.html.slice(0, 140)}`).join("\n")}`,
  );
  expect.soft(report, `${label}\n${report.join("\n")}`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("public pages have no WCAG 2.2 AA violations", async ({ page }) => {
      test.setTimeout(180_000);
      for (const path of publicPages) {
        await page.goto(path);
        await scan(page, path);
      }
      // An article and an issue, reached from the current issue.
      await page.goto("/issues/current");
      const issueUrl = page.url();
      await page.locator('main a[href^="/articles/"]').first().click();
      await page.waitForURL(/\/articles\//);
      await scan(page, page.url());
      expect(issueUrl).toMatch(/\/issues\//);
    });
  });
}

test.describe("signed in", () => {
  test.skip(!URL_ || !KEY, "requires Supabase");
  test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

  const created: { submission?: string } = {};

  test.beforeAll(async ({}, testInfo) => {
    // These tests run on desktop only; don't create the same accounts twice.
    if (testInfo.project.name !== "desktop") return;
    const db = sb();
    const ids: Record<string, string> = {};
    for (const [email, role] of [
      [admin, "super_admin"],
      [author, "author"],
    ]) {
      const { data } = await db.auth.admin.createUser({
        email,
        password: pw,
        email_confirm: true,
        app_metadata: { jhts_role: role },
        user_metadata: { full_name: `A11y ${role} ${run}` },
      });
      ids[role] = data.user!.id;
    }
    // A submission for the submission detail screen, removed afterwards.
    const { data: sub } = await db
      .from("submissions")
      .insert({ author_id: ids.author, type: "research_article", title: `A11y check ${run}`, status: "submitted" })
      .select("id")
      .single();
    created.submission = sub!.id;
  });

  test.afterAll(async () => {
    if (created.submission) await sb().from("submissions").delete().eq("id", created.submission);
  });

  async function signIn(page: Page, email: string) {
    await sb().from("rate_limit_buckets").delete().neq("key", "");
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(pw);
    await Promise.all([page.waitForURL(/\/account/), page.getByRole("button", { name: "Sign in" }).click()]);
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`author pages (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await signIn(page, author);
      for (const path of ["/account", "/submit"]) {
        await page.goto(path);
        await scan(page, path);
      }
    });

    test(`admin pages (${scheme})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ colorScheme: scheme });
      const db = sb();
      const [{ data: sub }, { data: issue }, { data: art }, { data: pay }, { data: pg }] = await Promise.all([
        db.from("submissions").select("id").eq("id", created.submission!).single(),
        db.from("issues").select("id").limit(1).single(),
        db.from("articles").select("id").limit(1).single(),
        db.from("payments").select("id").limit(1).maybeSingle(),
        db.from("pages").select("id").limit(1).single(),
      ]);
      await signIn(page, admin);
      const paths = [
        "/admin",
        "/admin/submissions",
        "/admin/submissions?view=board",
        `/admin/submissions/${sub!.id}`,
        "/admin/issues",
        `/admin/issues/${issue!.id}`,
        "/admin/articles",
        `/admin/articles/${art!.id}`,
        "/admin/in-press",
        "/admin/book-reviews",
        "/admin/categories",
        "/admin/call-for-papers",
        "/admin/pages",
        `/admin/pages/${pg!.id}`,
        "/admin/board",
        "/admin/messages",
        "/admin/users",
        "/admin/payments",
        ...(pay ? [`/admin/payments/${pay.id}`] : []),
        "/admin/reconciliation",
        "/admin/fund-summary",
        "/admin/analytics",
        "/admin/settings",
        "/admin/system",
        "/admin/audit",
        "/admin/handbook",
        "/admin/emails",
        "/admin/emails?t=receipt",
      ];
      for (const path of paths) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await scan(page, path);
      }
    });
  }
});
