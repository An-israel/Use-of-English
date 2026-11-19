import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * Submission and payments end to end, against a real Supabase stack. Fees are
 * paid by bank transfer: the author uploads the receipt and the Finance
 * Officer confirms it (or says why it can't be matched).
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL_ || !KEY, "requires Supabase");
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
const finance = { email: `sub.finance.${run}@example.test`, password: "finance-password-123" };
// A tiny PNG standing in for a photo of the transfer receipt.
const receiptPng = (name = "transfer-receipt.png") => ({
  name,
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
});
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
  // Several people sign in during these tests; keep the login rate limit out of the way.
  await sb().from("rate_limit_buckets").delete().neq("key", "");
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
  await db.auth.admin.createUser({
    email: finance.email,
    password: finance.password,
    email_confirm: true,
    app_metadata: { jhts_role: "finance_officer" },
    user_metadata: { full_name: "Fola Sample Finance" },
  });
});

/** The author pays into the journal's account and uploads the receipt. */
async function sendTransferReceipt(page: Page, amount: string) {
  const panel = page.getByTestId("bank-transfer");
  await expect(panel.getByText("1313504238")).toBeVisible();
  await expect(panel.getByText("Zenith Bank PLC")).toBeVisible();
  await expect(panel.getByText(amount).first()).toBeVisible();
  await expect(panel.getByText(/JHTCS-\d{4}-\d{4}/).first()).toBeVisible();
  await expect(panel.getByLabel("Name the transfer was made in")).toHaveValue(author.name);
  await panel.locator('input[type="file"]').setInputFiles(receiptPng());
  await expect(panel.getByText("transfer-receipt.png")).toBeVisible();
  await panel.getByRole("button", { name: "Send proof of payment" }).click();
  await expect(panel.getByText("We have your receipt", { exact: true })).toBeVisible({ timeout: 20_000 });
}

/** The newest transfer waiting for confirmation on a submission. */
async function awaitingTransfer(submissionId: string, fee: "review" | "publication") {
  return waitFor(async () => {
    const { data } = await sb()
      .from("payments")
      .select("id, reference, status")
      .eq("submission_id", submissionId)
      .eq("fee_type", fee)
      .eq("status", "pending")
      .not("proof_submitted_at", "is", null)
      .maybeSingle();
    return data;
  });
}

/** The Finance Officer checks the receipt and confirms the money arrived. */
async function confirmAsFinance(page: Page, paymentId: string) {
  await signIn(page, finance.email, finance.password);
  await page.goto("/admin/payments");
  await expect(page.getByRole("heading", { name: /bank transfers? to confirm/ })).toBeVisible();
  await page.goto(`/admin/payments/${paymentId}`);
  const proof = await page.request.get(`/api/payment-proofs/${paymentId}`, { maxRedirects: 5 });
  expect(proof.status()).toBe(200);
  await page.getByRole("button", { name: "Confirm payment received" }).click();
  await page.getByRole("button", { name: "Confirm payment", exact: true }).click();
  await expect(page.getByText(/Payment confirmed/)).toBeVisible();
}

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
  await page.waitForURL(/\/account\/submissions\/[0-9a-f-]{36}\?new=1/);
  await expect(page.getByText("Submission received")).toBeVisible();
  await sendTransferReceipt(page, "₦5,000");
  // Nothing moves on until the money is confirmed.
  const subId = submissionUrl.split("/").pop()!;
  const { data: waiting } = await sb().from("submissions").select("status").eq("id", subId).single();
  expect(waiting!.status).toBe("awaiting_review_fee");
  const transfer = await awaitingTransfer(subId, "review");
  expect(transfer.reference).toMatch(/^JHTCS-RF-\d{4}-\d{4}-1$/);

  await confirmAsFinance(page, transfer.id);
  await signIn(page, author.email, author.password);
  await page.goto(submissionUrl.replace("/submit/", "/account/submissions/"));
  await expect(
    page.getByText("Under screening").or(page.getByText("Submitted", { exact: true }).first()),
  ).toBeVisible();
  await expect(page.getByText(/JHTCS-\d{4}-\d{4}/).first()).toBeVisible();
  // The receipt is made by the job queue moments after the webhook.
  // After each reload, give React a moment to reveal the streamed part of the
  // page: until then it sits hidden, and a role query finds nothing.
  await waitFor(async () => {
    await page.reload();
    return page
      .getByRole("link", { name: /Receipt JHTCS-R-/ })
      .waitFor({ state: "visible", timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
  }).catch(async (err) => {
    // Say which step is missing: the receipt row, the job, or the page.
    const subId = submissionUrl.split("/").pop()!;
    const { data: pays } = await sb()
      .from("payments")
      .select("status, receipt_number, receipt_path, updated_at")
      .eq("submission_id", subId);
    const { data: jobs } = await sb()
      .from("jobs")
      .select("kind, status, attempts, last_error, priority")
      .like("dedupe_key", "receipt%")
      .order("id", { ascending: false })
      .limit(3);
    const shown = await page
      .getByRole("region", { name: "Payments and receipts" })
      .innerText()
      .catch(() => "(no payments section)");
    throw new Error(
      `${(err as Error).message}\npayments: ${JSON.stringify(pays)}\nreceipt jobs: ${JSON.stringify(jobs)}\npage: ${shown}\nurl: ${page.url()}`,
    );
  });
  const receipt = await page.request.get(
    await page
      .getByRole("link", { name: /Receipt JHTCS-R-/ })
      .getAttribute("href")
      .then((h) => h!),
    { maxRedirects: 5 },
  );
  expect(receipt.status()).toBe(200);
  expect((await receipt.body()).subarray(0, 4).toString()).toBe("%PDF");

  const id = submissionUrl.split("/").pop()!;
  const { data: emails } = await sb().from("email_outbox").select("template, status").eq("related_id", id);
  expect(emails?.map((e) => e.template)).toContain("submission_received");
  const { data: payEmails } = await sb().from("email_outbox").select("template").eq("related_id", transfer.id);
  expect(payEmails?.map((e) => e.template)).toEqual(expect.arrayContaining(["transfer_received", "payment_receipt"]));
});

test("only the Finance Officer confirms, and a confirmed fee is settled once", async ({ page }) => {
  const id = submissionUrl.split("/").pop()!;
  const db = sb();
  const { data: p } = await db.from("payments").select("id").eq("submission_id", id).eq("status", "success").single();
  // Editors can see payments but not confirm them.
  await signIn(page, editor.email, editor.password);
  await page.goto(`/admin/payments/${p!.id}`);
  await expect(page.getByRole("button", { name: "Confirm payment received" })).toHaveCount(0);
  // The fee is no longer due, so another receipt can't be recorded against it.
  const again = await db.rpc("submit_bank_transfer", {
    p_submission: id,
    p_fee: "review",
    p_amount_kobo: 500000,
    p_proof_path: `proofs/${id}/review-x.png`,
    p_proof_name: "x.png",
    p_payer: author.name,
    p_transfer_date: new Date().toISOString().slice(0, 10),
  });
  expect(again.error?.message).toMatch(/not due/);
  // Without a signed-in Finance Officer the database refuses to confirm.
  const anon = await db.rpc("confirm_bank_transfer", { p_payment: p!.id });
  expect(anon.error?.message).toMatch(/Finance Officer/);
  const { count } = await db
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
  await sendTransferReceipt(page, "₦20,000");
  const first = await awaitingTransfer(id, "publication");

  // Finance can't find it: the author is told why and uploads again.
  await signIn(page, finance.email, finance.password);
  await page.goto(`/admin/payments/${first.id}`);
  await page.getByLabel("Reason").fill("No transfer of ₦20,000 reached the account on that date.");
  await page.getByRole("button", { name: "Not received: tell the author" }).click();
  await expect(page.getByText("The author has been told")).toBeVisible();

  await signIn(page, author.email, author.password);
  await page.goto(`/account/submissions/${id}`);
  await expect(page.getByText("No transfer of ₦20,000 reached the account on that date.")).toBeVisible();
  await sendTransferReceipt(page, "₦20,000");
  const second = await awaitingTransfer(id, "publication");
  expect(second.id).not.toBe(first.id);
  await confirmAsFinance(page, second.id);

  await signIn(page, author.email, author.password);
  await page.goto(`/account/submissions/${id}`);
  await expect(page.getByText("In production").first()).toBeVisible();
  const letter = await page.request.get(`/api/acceptance-letter/${id}`);
  expect(letter.status()).toBe(200);
  expect(letter.headers()["content-type"]).toBe("application/pdf");
});

test("an editor can waive the fee instead of payment", async ({ page }) => {
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
  await page.waitForURL(/\/account\/submissions\/[0-9a-f-]{36}\?new=1/);
  await expect(page.getByTestId("bank-transfer")).toBeVisible();

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
