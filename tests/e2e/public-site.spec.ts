import { expect, test } from "@playwright/test";

const pages = [
  ["/issues", "All Issues"],
  ["/in-press", "Articles in Press"],
  ["/book-reviews", "New books, read closely"],
  ["/subjects", "Nine threads, one cloth"],
  ["/subjects/language-literature-and-linguistics", "Language, Literature and Linguistics"],
  ["/about", "About the Journal"],
  ["/aims-and-scope", "Aims and Scope"],
  ["/use-of-english-unit", "The Use of English Unit"],
  ["/call-for-papers", "Vol. 1 No. 1 (March 2027)"],
  ["/author-guidelines", "Author Guidelines"],
  ["/fees", "Fees and Payment"],
  ["/policies", "Policies"],
  ["/policies/peer-review", "Peer Review Policy"],
  ["/policies/reviewer-guidelines", "Guidelines for Reviewers"],
  ["/policies/generative-ai", "Generative AI in Writing and Reviewing"],
  ["/policies/complaints-and-appeals", "Complaints and Appeals"],
  ["/faq", "Questions and Timeline"],
  ["/contact", "Contact the editorial office"],
] as const;

for (const [path, heading] of pages) {
  test(`${path} renders`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });
}

test("archive filters issues by year", async ({ page }) => {
  await page.goto("/issues", { waitUntil: "networkidle" });
  await page.getByRole("combobox", { name: "Year" }).selectOption("2028");
  await expect(page.getByText("1 issue", { exact: true })).toBeVisible();
});

test("search finds, highlights and filters", async ({ page }) => {
  await page.goto("/search?q=proverbs");
  const first = page.locator(".search-hit").first();
  await expect(first.locator("h3 mark")).toHaveText(/proverbs/i);
  await page.goto("/search?type=book_review");
  await expect(page.getByText("3 results")).toBeVisible();
  await page.goto("/search?q=zzqqxx");
  await expect(page.getByText("No matches")).toBeVisible();
});

test("fee pages carry the integrity statement", async ({ page }) => {
  await page.goto("/fees");
  await expect(page.getByRole("note")).toHaveText(/Payment of fees does not guarantee acceptance/);
  await expect(page.getByRole("cell", { name: "₦5,000" })).toBeVisible();
});

test("contact form validates in place", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Please enter your name.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toHaveAttribute("aria-invalid", "true");
});

test("privacy redirects to the policy", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page).toHaveURL(/\/policies\/privacy$/);
});

test("missing content answers with a real 404 (B1)", async ({ request }) => {
  for (const path of [
    "/articles/no-such-article",
    "/subjects/no-such-subject",
    "/policies/no-such-policy",
    "/issues/99/9",
  ]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(404);
    expect(await res.text()).toContain("Page not found");
  }
});

test("old subject addresses and feed guesses redirect", async ({ request }) => {
  const subject = await request.get("/subjects/translation-studies", { maxRedirects: 0 });
  expect(subject.status()).toBe(308);
  expect(subject.headers().location).toMatch(/\/subjects\/language-literature-and-linguistics$/);
  for (const path of ["/feed", "/rss"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.headers().location).toMatch(/\/rss\.xml$/);
  }
});

test("security.txt, manifest and icons are served", async ({ request }) => {
  const sec = await request.get("/.well-known/security.txt");
  expect(sec.status()).toBe(200);
  expect(await sec.text()).toMatch(/^Contact: \S+\nExpires: \d{4}-/m);
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.short_name).toBe("JHTS");
  for (const path of [
    "/favicon.ico",
    "/apple-icon.png",
    "/brand/icon-512.png",
    "/templates/JHTS-manuscript-template.docx",
  ])
    expect((await request.get(path)).status(), path).toBe(200);
});

test("the contact page lists the enquiry contacts", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByRole("main").getByRole("link", { name: "+234 (0)803 665 9581" })).toHaveAttribute(
    "href",
    "tel:+2348036659581",
  );
  await expect(page.getByRole("main").getByText("Editor-in-Chief", { exact: true })).toBeVisible();
});
