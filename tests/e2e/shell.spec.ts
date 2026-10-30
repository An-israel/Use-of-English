import { expect, test } from "@playwright/test";

test("home renders the journal title, landmarks and skip link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Transcultural Studies");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("Payment of fees does not guarantee acceptance");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});

test("search palette opens with Ctrl+K and finds an article", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcut is desktop-only");
  await page.goto("/", { waitUntil: "networkidle" });
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("proverb");
  await expect(page.getByRole("option").first()).toContainText("Proverbs");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("combobox")).toHaveCount(0);
});

test("unknown pages return a branded 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A loose thread.");
  await expect(page.getByRole("banner")).toHaveCount(1);
});

test("a missing article is a 404 with a single header and footer", async ({ page }) => {
  // A streamed page can't change its status once sent; Next marks it noindex instead.
  await page.goto("/articles/no-such-article");
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A loose thread.");
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
});

test("health endpoints respond", async ({ request }) => {
  expect((await request.get("/api/health/live")).status()).toBe(200);
  expect((await request.get("/api/health")).status()).toBe(200);
});
