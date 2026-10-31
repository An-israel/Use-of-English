import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

/**
 * Submission and payments end to end, against a real Supabase stack with
 * PAYSTACK_MODE=mock (the simulated checkout sends signed webhooks).
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL_ || !KEY || process.env.PAYSTACK_MODE !== "mock", "requires Supabase and PAYSTACK_MODE=mock");
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");
test.describe.configure({ mode: "serial" });

const sb = () => createClient(URL_!, KEY!, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const author = {
  email: `sub.author.${run}@example.test`,
  password: "author-password-123",
  name: "Ngozi Sample Author",
};
const editor = { email: `sub.editor.${run}@example.test`, password: "editor-password-123" };
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const docx = (name: string) => ({
  name,
  mimeType: DOCX,
  buffer: Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(2048, 1)]),
});
const ABSTRACT = Array.from(
  { length: 160 },
  (_, i) => ["language", "culture", "translation", "meaning", "reader"][i % 5],
).join(" ");
let submissionUrl = "";

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await Promise.all([page.waitForURL(/\/account/), page.getByRole("button", { name: "Sign in" }).click()]);
}

async function waitFor<T>(fn: () => Promise<T | null | undefined>, ms = 20_000): Promise<T> {
  const until = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > until) throw new Error("timed out waiting");
    await new Promise((r) => setTimeout(r, 500));
  }
}

test.beforeAll(async () => {
  const db = sb();
  await db.from("rate_limit_buckets").delete().neq("key", "");
  await db.auth.admin.createUser({
    email: author.email,
    password: author.password,
    email_confirm: true,
    user_metadata: { full_name: author.name },
  });
  await db.auth.admin.createUser({
    email: editor.email,
    password: editor.password,
    email_confirm: true,
    app_metadata: { jhts_role: "editor" },
    user_metadata: { full_name: "Ed Sample Editor" },
  });
});

test("an author submits a manuscript and pays the review fee", async ({ page }) => {
  await signIn(page, author.email, author.password);
  await page.goto("/submit");
  await page.getByRole("button", { name: "Start your submission" }).click();
  await page.waitForURL(/\/submit\/[0-9a-f-]{36}$/);
  submissionUrl = page.url();

  // Step 1: validation, then details
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("Please complete the highlighted fields.")).toBeVisible();
  await page.getByLabel("Title").fill("Proverbs, Pidgin and the Making of Meaning in Nsukka Markets");
  await page.getByLabel("Subject area").selectOption({ label: "Language, Literature and Linguistics" });
  await page.getByLabel(/Abstract/).fill(ABSTRACT);
  await expect(page.getByText("160 / 150–250 words")).toBeVisible();
  for (const k of ["proverbs", "Nigerian Pidgin", "markets"]) {
    await page.getByLabel(/Keywords/).fill(k);
    await page.keyboard.press("Enter");
  }
  await page.getByLabel("APA 7th edition").check();
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Step 2: authors (submitter pre-filled), add a co-author
  await expect(page.getByRole("heading", { name: "Authors" })).toBeVisible();
  await expect(page.getByLabel("Full name").first()).toHaveValue(author.name);
  await page.getByRole("button", { name: "Add a co-author" }).click();
  await page.getByLabel("Full name").nth(1).fill("Chidi Sample Coauthor");
  await page.getByLabel("Email").nth(1).fill(`co.${run}@example.test`);
  await page.getByRole("button", { name: "Move author 2 up" }).click();
  await expect(page.getByLabel("Full name").first()).toHaveValue("Chidi Sample Coauthor");
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Step 3: files straight to storage
  await expect(page.getByRole("heading", { name: "Files" })).toBeVisible();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText("Upload the anonymised manuscript and the title page to continue.")).toBeVisible();
  const inputs = page.locator('input[type="file"]');
  await inputs.nth(0).setInputFiles(docx("manuscript.docx"));
  await expect(page.getByText("manuscript.docx")).toBeVisible();
  await inputs.nth(1).setInputFiles(docx("title-page.docx"));
  await expect(page.getByText("title-page.docx")).toBeVisible();
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Step 4: declarations
  await expect(page.getByRole("heading", { name: "Declarations" })).toBeVisible();
  for (const box of await page.getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Save and continue" }).click();

  // Step 5: review, submit, pay
  await expect(page.getByText("Review and plagiarism-check fee: ₦5,000")).toBeVisible();
  await page.getByRole("button", { name: "Submit manuscript" }).click();
  await expect(page.getByRole("heading", { name: "Pay the review fee" })).toBeVisible();
  await page.getByRole("button", { name: /Pay ₦5,000 with Paystack/ }).click();
  await page.waitForURL(/\/dev\/paystack/);
  await expect(page.getByText("Test mode · simulated checkout")).toBeVisible();
  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible({ timeout: 20_000 });

  await page.getByRole("link", { name: "View your submission" }).click();
  await expect(
    page.getByText("Under screening").or(page.getByText("Submitted", { exact: true }).first()),
  ).toBeVisible();
  await expect(page.getByText(/JHTS-\d{4}-\d{4}/).first()).toBeVisible();
  // The receipt is made by the job queue moments after the webhook.
  await waitFor(async () => {
    await page.reload();
    return (await page.getByRole("link", { name: /Receipt JHTS-R-/ }).count()) > 0;
  });
  const receipt = await page.request.get(
    await page
      .getByRole("link", { name: /Receipt JHTS-R-/ })
      .getAttribute("href")
      .then((h) => h!),
    { maxRedirects: 5 },
  );
  expect(receipt.status()).toBe(200);
  expect((await receipt.body()).subarray(0, 4).toString()).toBe("%PDF");

  const id = submissionUrl.split("/").pop()!;
  const { data: emails } = await sb().from("email_outbox").select("template, status").eq("related_id", id);
  expect(emails?.map((e) => e.template)).toContain("submission_received");
});

test("payments are idempotent and webhooks must be signed", async ({ request }) => {
  const id = submissionUrl.split("/").pop()!;
  const { data: p } = await sb()
    .from("payments")
    .select("reference, amount_kobo")
    .eq("submission_id", id)
    .eq("status", "success")
    .single();
  const body = JSON.stringify({ event: "charge.success", data: { reference: p!.reference, amount: p!.amount_kobo } });
  const bad = await request.post("/api/webhooks/paystack", {
    data: body,
    headers: { "content-type": "application/json", "x-paystack-signature": "nope" },
  });
  expect(bad.status()).toBe(401);
  const sig = createHmac("sha512", "sk_test_mock_local_only").update(body).digest("hex");
  const again = await request.post("/api/webhooks/paystack", {
    data: body,
    headers: { "content-type": "application/json", "x-paystack-signature": sig },
  });
  expect(await again.json()).toMatchObject({ ok: true, outcome: "duplicate" });
  const { count } = await sb()
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("submission_id", id)
    .eq("status", "success");
  expect(count).toBe(1);
});

test("an editor accepts it, the author pays the publication fee and downloads the letter", async ({ page }) => {
  const id = submissionUrl.split("/").pop()!;
  await signIn(page, editor.email, editor.password);
  await page.goto(`/admin/submissions/${id}`);
  for (const to of ["Under screening", "Plagiarism check", "Under peer review", "Accepted, awaiting publication fee"]) {
    await page.getByLabel("New status").selectOption({ label: to });
    if (to.startsWith("Accepted"))
      await page.getByLabel(/Message to the author/).fill("Congratulations: the reviewers recommend acceptance.");
    await page.getByRole("button", { name: "Update status" }).click();
    await expect(page.getByText(`Moved to “${to}”.`)).toBeVisible();
    await page.reload();
  }

  await signIn(page, author.email, author.password);
  await page.goto(`/account/submissions/${id}`);
  await expect(page.getByText("Congratulations: the reviewers recommend acceptance.")).toBeVisible();
  await page.getByRole("button", { name: "Pay publication fee" }).click();
  await page.waitForURL(/\/dev\/paystack/);
  await expect(page.getByRole("heading", { name: "Pay ₦20,000" })).toBeVisible();
  await page.getByRole("button", { name: "Simulate successful payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment received" })).toBeVisible({ timeout: 20_000 });
  await page.goto(`/account/submissions/${id}`);
  await expect(page.getByText("In production").first()).toBeVisible();
  const letter = await page.request.get(`/api/acceptance-letter/${id}`);
  expect(letter.status()).toBe(200);
  expect(letter.headers()["content-type"]).toBe("application/pdf");
});

test("a failed payment can be retried, and an editor can waive the fee instead", async ({ page }) => {
  // Second submission prepared directly in the database, then submitted by the author.
  await signIn(page, author.email, author.password);
  const db = sb();
  const { data: profile } = await db.from("profiles").select("id").eq("email", author.email).single();
  const { data: cat } = await db.from("categories").select("id").limit(1).single();
  const { data: s } = await db
    .from("submissions")
    .insert({
      author_id: profile!.id,
      type: "book_review",
      title: "Review of a Sample Book on Language",
      abstract: ABSTRACT,
      keywords: ["one", "two", "three"],
      citation_style: "mla9",
      category_id: cat!.id,
      declarations: { original: true, notElsewhere: true, allAgree: true, guidelines: true, fees: true, all: true },
    })
    .select("id")
    .single();
  await db
    .from("submission_authors")
    .insert({ submission_id: s!.id, position: 1, name: author.name, email: author.email, is_corresponding: true });
  for (const kind of ["manuscript", "title_page"]) {
    await db.from("submission_files").insert({
      submission_id: s!.id,
      kind,
      version: 1,
      storage_path: `${s!.id}/${kind}/v1-x.docx`,
      original_name: "x.docx",
      mime_type: DOCX,
      size_bytes: 10,
    });
  }
  await page.goto(`/submit/${s!.id}`);
  for (const next of ["Authors", "Files", "Declarations", "Review and submit"]) {
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.getByRole("heading", { name: next, level: 2 })).toBeVisible();
  }
  await page.getByRole("button", { name: "Submit manuscript" }).click();
  await page.getByRole("button", { name: /with Paystack/ }).click();
  await page.waitForURL(/\/dev\/paystack/);
  await page.getByRole("button", { name: "Simulate failed payment" }).click();
  await expect(page.getByRole("heading", { name: "Payment not completed" })).toBeVisible({ timeout: 20_000 });

  await signIn(page, editor.email, editor.password);
  await page.goto(`/admin/submissions/${s!.id}`);
  await page.getByLabel("Reason (kept on record)").fill("Student author; fee waived by the Editor-in-Chief.");
  await page.getByRole("button", { name: "Waive fee" }).click();
  await expect(page.getByText("Review fee waived: Student author; fee waived by the Editor-in-Chief.")).toBeVisible();
  const { data: after } = await db.from("submissions").select("status").eq("id", s!.id).single();
  expect(after!.status).toBe("submitted");
  const { data: waived } = await db
    .from("payments")
    .select("amount_kobo, waiver_reason")
    .eq("submission_id", s!.id)
    .eq("status", "waived")
    .single();
  expect(waived).toMatchObject({ amount_kobo: 0 });
});
