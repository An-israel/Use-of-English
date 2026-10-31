import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/** I4: "Download my data" and "Delete my account" (Nigeria Data Protection Act 2023). */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL_ || !KEY, "requires Supabase");
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");

const sb = () => createClient(URL_!, KEY!, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const pw = "data-rights-password-123";

async function makeAuthor(email: string) {
  const { data, error } = await sb().auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    app_metadata: { jhts_role: "author" },
    user_metadata: { full_name: `Data Rights ${run}` },
  });
  if (error) throw error;
  return data.user!.id;
}

async function signIn(page: Page, email: string) {
  await sb().from("rate_limit_buckets").delete().neq("key", "");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await Promise.all([page.waitForURL(/\/account/), page.getByRole("button", { name: "Sign in" }).click()]);
}

async function deleteAccount(page: Page) {
  await page.getByRole("button", { name: "I want to delete my account" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("delete");
  await Promise.all([page.waitForURL(/\/goodbye$/), page.getByRole("button", { name: "Delete my account" }).click()]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your account has been deleted");
}

test("an author downloads their data, then deletes an account with nothing to keep", async ({ page }) => {
  const email = `data.empty.${run}@example.test`;
  const id = await makeAuthor(email);
  // A draft: deleted with the account.
  await sb()
    .from("submissions")
    .insert({ author_id: id, type: "research_article", title: `Draft ${run}`, status: "draft" });
  await signIn(page, email);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download my data" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^jhts-my-data-\d{4}-\d{2}-\d{2}\.json$/);
  const data = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(data.profile.email).toBe(email);
  expect(data.submissions.map((s: { title: string }) => s.title)).toContain(`Draft ${run}`);

  await deleteAccount(page);
  const { data: user } = await sb().auth.admin.getUserById(id);
  expect(user.user).toBeNull();
  const { count } = await sb().from("submissions").select("id", { count: "exact", head: true }).eq("author_id", id);
  expect(count).toBe(0);
});

test("an author with a submitted manuscript is anonymised, and can no longer sign in", async ({ page }) => {
  const email = `data.kept.${run}@example.test`;
  const id = await makeAuthor(email);
  const { data: sub } = await sb()
    .from("submissions")
    .insert({ author_id: id, type: "research_article", title: `Kept ${run}`, status: "submitted" })
    .select("id")
    .single();
  await signIn(page, email);
  await deleteAccount(page);

  const { data: profile } = await sb().from("profiles").select("full_name, email, is_active").eq("id", id).single();
  expect(profile).toMatchObject({ full_name: "Deleted account", is_active: false });
  expect(profile!.email).not.toBe(email);
  const { data: kept } = await sb().from("submissions").select("title").eq("id", sub!.id).single();
  expect(kept!.title).toBe(`Kept ${run}`);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);

  await sb().from("submissions").delete().eq("id", sub!.id);
});

test("staff accounts can't be deleted from My account", async ({ page }) => {
  const email = `data.staff.${run}@example.test`;
  await sb().auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    app_metadata: { jhts_role: "editor" },
    user_metadata: { full_name: `Data Staff ${run}` },
  });
  await sb().from("rate_limit_buckets").delete().neq("key", "");
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)/);
  await page.goto("/account");
  await expect(page.getByText("Staff accounts are closed by a Super Admin")).toBeVisible();
  await expect(page.getByRole("button", { name: "I want to delete my account" })).toHaveCount(0);
});
