import { expect, test } from "@playwright/test";

const pages = [
  ["/issues", "All Issues"],
  ["/in-press", "Articles in Press"],
  ["/book-reviews", "New books, read closely"],
  ["/subjects", "Eight threads, one cloth"],
  ["/subjects/translation-studies", "Translation Studies"],
  ["/about", "About the Journal"],
  ["/aims-and-scope", "Aims and Scope"],
  ["/use-of-english-unit", "The Use of English Unit"],
  ["/call-for-papers", "Vol. 1 No. 1 (March 2027)"],
  ["/author-guidelines", "Author Guidelines"],
  ["/fees", "Fees and Payment"],
  ["/policies", "Policies"],
  ["/policies/peer-review", "Peer Review Policy"],
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
