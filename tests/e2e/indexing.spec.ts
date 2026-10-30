import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * Milestone 8: counted downloads, views, the PDF reader, analytics and
 * scholarly indexing (sitemap, RSS, OG images, Crossref XML, OAI-PMH).
 * Uses a seeded SAMPLE article; everything changed is put back afterwards.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL_ || !KEY, "requires Supabase");
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");
test.describe.configure({ mode: "serial" });

// A real browser's user agent: headless browsers are (rightly) not counted.
const READER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
test.use({ userAgent: READER_UA });

const sb = () => createClient(URL_!, KEY!, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const pw = "indexing-test-password-123";
const admin = { email: `m8.admin.${run}@example.test` };
const SLUG = "code-switching-and-authority-in-nsukka-classrooms";
let articleId = "";
let issueId = "";

async function signIn(page: Page, email: string) {
  await sb().from("rate_limit_buckets").delete().neq("key", "");
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await Promise.all([page.waitForURL(/\/account/), page.getByRole("button", { name: "Sign in" }).click()]);
}

async function metricCount(kind: string) {
  const { count } = await sb()
    .from("metrics_events")
    .select("id", { count: "exact", head: true })
    .eq("article_id", articleId)
    .eq("kind", kind);
  return count ?? 0;
}

test.beforeAll(async () => {
  const db = sb();
  await db.auth.admin.createUser({
    email: admin.email,
    password: pw,
    email_confirm: true,
    app_metadata: { jhts_role: "super_admin" },
    user_metadata: { full_name: "Indexing Sample Admin" },
  });
  const { data } = await db.from("articles").select("id, issue_id").eq("slug", SLUG).single();
  articleId = data!.id;
  issueId = data!.issue_id;
  await db.from("metrics_events").delete().eq("article_id", articleId);
});

test.afterAll(async () => {
  const db = sb();
  await db.from("articles").update({ pdf_path: null }).eq("id", articleId);
  await db.from("metrics_events").delete().eq("article_id", articleId);
});

test("an editor uploads the PDF; readers get the in-page reader", async ({ page }) => {
  await signIn(page, admin.email);
  await page.goto(`/admin/articles/${articleId}`);
  await page.waitForLoadState("networkidle"); // a file chosen before hydration has no handler yet
  await page.getByLabel("Upload PDF").setInputFiles("tests/e2e/fixtures/sample-article.pdf");
  await expect(page.getByText("PDF uploaded.")).toBeVisible({ timeout: 20_000 });

  await page.context().clearCookies();
  await page.goto(`/articles/${SLUG}`);
  // pdf.js loads only when the reader comes near the viewport.
  await page.getByRole("heading", { name: "The typeset PDF" }).scrollIntoViewIfNeeded();
  const reader = page.getByRole("region", { name: /PDF reader/ });
  await expect(reader.getByText("of 3")).toBeVisible({ timeout: 20_000 });
  await expect(reader.locator("canvas").first()).toBeVisible();
  await reader.getByRole("button", { name: "Zoom in" }).click();
  await expect(reader.getByText("125%")).toBeVisible();
  await reader.getByRole("textbox", { name: "Page" }).fill("3");
  await reader.getByRole("textbox", { name: "Page" }).press("Enter");
  await expect(reader.locator('[data-page="3"] canvas')).toBeVisible();
  await expect(reader.getByText("What translators keep")).toBeAttached(); // text layer
});

test("downloads are counted once per reader per day, under a clean name; bots are not", async ({ page }) => {
  const res = await page.request.get(`/api/download/article/${articleId}?format=pdf`, { maxRedirects: 0 });
  expect(res.status()).toBe(302);
  const to = res.headers()["location"];
  expect(to).toContain("/storage/v1/object/public/published/");
  expect(decodeURIComponent(to)).toContain("download=JHTS_Vol1_No1_2027_Okafor.pdf");
  const file = await page.request.get(to);
  expect(file.status()).toBe(200);
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await expect.poll(() => metricCount("download"), { timeout: 10_000 }).toBe(1);
  await page.request.get(`/api/download/article/${articleId}?format=pdf`, { maxRedirects: 0 });
  await page.request.get(`/api/download/article/${articleId}?format=pdf`, {
    maxRedirects: 0,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
  });
  await page.waitForTimeout(1500);
  expect(await metricCount("download")).toBe(1);
  expect((await page.request.get(`/api/download/article/${articleId}?format=docx`, { maxRedirects: 0 })).status()).toBe(
    404,
  );
});

test("article views are counted, and analytics shows them", async ({ page }) => {
  await page.goto(`/articles/${SLUG}`);
  await expect.poll(() => metricCount("view"), { timeout: 10_000 }).toBe(1);
  await page.reload();
  await page.waitForTimeout(1500);
  expect(await metricCount("view")).toBe(1);

  await sb().rpc("rollup_metrics", { p_day: new Date().toISOString().slice(0, 10) });
  await signIn(page, admin.email);
  await page.goto("/admin/analytics?range=30");
  await expect(page.getByRole("img", { name: /Views and downloads per day/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Code-Switching/ })).toBeVisible();
  await page.getByText("Show as a table").click();
  await expect(page.getByRole("cell", { name: "1" }).first()).toBeVisible();
});

/** The generated image URL as the page advertises it (Next adds a content hash). */
async function ogImage(request: import("@playwright/test").APIRequestContext, path: string) {
  const html = await (await request.get(path)).text();
  const url = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
  expect(url).toBeTruthy();
  return request.get(url!);
}

test("sitemap, robots, RSS and social images", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`/articles/${SLUG}</loc>`);
  expect(sitemap).toContain("/issues/1/1</loc>");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
  const rss = await request.get("/rss.xml");
  expect(rss.headers()["content-type"]).toContain("application/rss+xml");
  expect(await rss.text()).toContain(`<link>`);
  const og = await ogImage(request, `/articles/${SLUG}`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toBe("image/png");
  expect((await ogImage(request, "/issues/1/1")).headers()["content-type"]).toBe("image/png");
  expect((await ogImage(request, "/about")).headers()["content-type"]).toBe("image/png");
});

/** Save the settings form with this DOI prefix and wait until the database has it. */
async function saveDoiPrefix(page: Page, prefix: string) {
  await page.goto("/admin/settings");
  await page.getByLabel("DOI prefix").fill(prefix);
  await page.getByRole("button", { name: "Save settings" }).click();
  // The page was just loaded, so this toast can only come from this save.
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await expect
    .poll(
      async () =>
        (await sb().from("site_settings").select("value").eq("key", "doiPrefix").maybeSingle()).data?.value ?? "",
    )
    .toBe(prefix);
}

test("Crossref XML and OAI-PMH, switched on from Settings", async ({ page }) => {
  await signIn(page, admin.email);
  await saveDoiPrefix(page, ""); // a known starting point, through the app so caches agree
  // Without a DOI prefix the export explains what's missing.
  expect((await page.request.get(`/api/admin/crossref/${issueId}`)).status()).toBe(409);
  await saveDoiPrefix(page, "10.99999");
  const xml = await page.request.get(`/api/admin/crossref/${issueId}`);
  expect(xml.status()).toBe(200);
  const body = await xml.text();
  expect(body).toContain('<doi_batch version="5.3.1"');
  expect(body).toContain("<doi>10.99999/jhts.2027.1.1.");

  expect((await page.request.get("/api/oai?verb=Identify")).status()).toBe(404);
  await page.goto("/admin/settings");
  const flag = page.getByRole("switch", { name: /OAI-PMH/ });
  await flag.click();
  await expect(flag).toHaveAttribute("aria-checked", "true");
  const identify = await (await page.request.get("/api/oai?verb=Identify")).text();
  expect(identify).toContain("<protocolVersion>2.0</protocolVersion>");
  const records = await (await page.request.get("/api/oai?verb=ListRecords&metadataPrefix=oai_dc")).text();
  expect(records).toContain(`/articles/${SLUG}</dc:identifier>`);

  // Put Settings back as they were.
  await flag.click();
  await expect(flag).toHaveAttribute("aria-checked", "false");
  await saveDoiPrefix(page, "");
});
