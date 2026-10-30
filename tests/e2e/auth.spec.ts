import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * Account flows against a real Supabase stack. Needs MAIL_DIR (an SMTP sink
 * writing .eml files) plus the Supabase URL and service-role key; skipped otherwise.
 */
const MAIL_DIR = process.env.MAIL_DIR;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!MAIL_DIR || !SUPABASE_URL || !SERVICE_KEY, "requires a local Supabase stack and mail sink");
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "account flows run once, on desktop");

const run = Date.now().toString(36);
const author = { name: "Ada Test Okafor", email: `author.${run}@example.test`, password: "first-password-123" };
const admin = { email: `admin.${run}@example.test`, password: "admin-password-123" };
const reviewerEmail = `reviewer.${run}@example.test`;

// Repeated runs from one machine would otherwise hit the app's own sign-up limits.
test.beforeAll(async () => {
  const sb = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });
  await sb.from("rate_limit_buckets").delete().neq("key", "");
});

function decodeQP(s: string) {
  return s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

async function latestLink(to: string, baseURL: string, timeout = 15_000): Promise<string> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const files = readdirSync(MAIL_DIR!).sort().reverse();
    for (const f of files) {
      const raw = readFileSync(join(MAIL_DIR!, f), "latin1");
      if (!raw.toLowerCase().includes(to.toLowerCase())) continue;
      const body = Buffer.from(decodeQP(raw), "latin1").toString("utf8");
      const m = body.match(/https?:\/\/[^"\s<]+\/auth\/confirm\?[^"\s<]+/);
      if (m) {
        const u = new URL(m[0].replace(/&amp;/g, "&"));
        return new URL(u.pathname + u.search, baseURL).toString();
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`no email for ${to}`);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/login")),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
}

test("register, confirm email and land on the dashboard", async ({ page, baseURL }) => {
  await page.goto("/register");
  await page.getByLabel("Full name").fill(author.name);
  await page.getByLabel("Email").fill(author.email);
  await page.getByLabel("Password").fill(author.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Please accept the privacy policy")).toBeVisible();
  await page.getByLabel("Password").fill(author.password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  await page.goto(await latestLink(author.email, baseURL!));
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Ada");
  await expect(page.getByText("No submissions yet")).toBeVisible();
});

test("wrong password is refused; right password signs in; protected pages need sign-in", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  await signIn(page, author.email, "not-the-password-1");
  await expect(page.getByText("That email and password don’t match an account.")).toBeVisible();
  await signIn(page, author.email, author.password);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?denied=1/);
  await expect(page.getByText("Your account doesn’t have access to that page.")).toBeVisible();
});

test("reset a forgotten password", async ({ page, baseURL }) => {
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(author.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/a link to reset your password is on its way/)).toBeVisible();
  await page.goto(await latestLink(author.email, baseURL!));
  await expect(page).toHaveURL(/\/reset-password$/);
  author.password = "second-password-456";
  await page.getByLabel("New password").fill(author.password);
  await page.getByLabel("Confirm password").fill(author.password);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Your new password is saved.")).toBeVisible();
  await page.context().clearCookies();
  await signIn(page, author.email, author.password);
  await expect(page).toHaveURL(/\/account$/);
});

test("profile edits validate ORCID and save", async ({ page }) => {
  await signIn(page, author.email, author.password);
  await page.getByLabel("ORCID iD").fill("1234");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Use the form 0000-0002-1825-0097.")).toBeVisible();
  await page.getByLabel("ORCID iD").fill("https://orcid.org/0000-0002-1825-0097");
  await page.getByLabel("Affiliation").fill("Department of English, Sample University");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
});

test("a Super Admin invites a reviewer, who accepts and sets a password", async ({ page, baseURL }) => {
  const sb = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.admin.createUser({
    email: admin.email,
    password: admin.password,
    email_confirm: true,
    app_metadata: { jhts_role: "super_admin" },
    user_metadata: { full_name: "Test Super Admin" },
  });
  expect(error).toBeNull();
  expect(data.user).toBeTruthy();

  await signIn(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Users and roles");
  await page.getByLabel("Name", { exact: true }).fill("Rita Reviewer");
  await page.getByLabel("Email", { exact: true }).fill(reviewerEmail);
  await page.getByLabel("Role", { exact: true }).selectOption("reviewer");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation sent to ${reviewerEmail} as Reviewer.`)).toBeVisible();

  await page.context().clearCookies();
  await page.goto(await latestLink(reviewerEmail, baseURL!));
  await expect(page).toHaveURL(/\/account\/welcome$/);
  await expect(page.getByText("Invitation · Reviewer")).toBeVisible();
  await page.getByLabel("New password").fill("reviewer-password-789");
  await page.getByLabel("Confirm password").fill("reviewer-password-789");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Reviewer account")).toBeVisible();
  await expect(page.getByRole("heading", { name: "My reviews" })).toBeVisible();
});

test("deactivating an account blocks sign-in", async ({ page }) => {
  await signIn(page, admin.email, admin.password);
  await expect(page).toHaveURL(/\/account$/);
  await page.goto("/admin/users");
  // Deactivate the author, then confirm they can no longer sign in.
  page.once("dialog", (d) => d.accept());
  const row = page.getByRole("row", { name: new RegExp(author.email) });
  await row.getByRole("button", { name: "Deactivate" }).click();
  await expect(page.getByText("Account deactivated.")).toBeVisible();
  await page.context().clearCookies();
  await signIn(page, author.email, author.password);
  await expect(page.getByText("That email and password don’t match an account.")).toBeVisible();
});
