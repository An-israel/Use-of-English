import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * Finance (brief section 7.3): the payments table, exports, refunds,
 * confirming bank transfers and who may do what. Needs Supabase.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL_ || !KEY, "requires Supabase");
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");
test.describe.configure({ mode: "serial" });

const sb = () => createClient(URL_!, KEY!, { auth: { persistSession: false } });
const run = Date.now().toString(36).toUpperCase();
const pw = "finance-test-password-123";
const users = {
  finance: { email: `m7.finance.${run.toLowerCase()}@example.test`, role: "finance_officer" },
  editor: { email: `m7.editor.${run.toLowerCase()}@example.test`, role: "editor" },
  author: { email: `m7.author.${run.toLowerCase()}@example.test`, role: "author" },
} as const;
const ids: Record<string, string> = {};
const ref = (n: string) => `JHTCS-T${run}-${n}`;
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());

async function signIn(page: Page, who: keyof typeof users) {
  await sb().from("rate_limit_buckets").delete().neq("key", "");
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(users[who].email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await Promise.all([page.waitForURL(/\/account/), page.getByRole("button", { name: "Sign in" }).click()]);
}

test.beforeAll(async () => {
  const db = sb();
  for (const [k, u] of Object.entries(users)) {
    const { data } = await db.auth.admin.createUser({
      email: u.email,
      password: pw,
      email_confirm: true,
      app_metadata: u.role === "author" ? {} : { jhts_role: u.role },
      user_metadata: { full_name: `${k[0].toUpperCase()}${k.slice(1)} Sample ${run}` },
    });
    ids[k] = data.user!.id;
  }
  const sub = async (n: string) =>
    (
      await db
        .from("submissions")
        .insert({
          author_id: ids.author,
          type: "research_article",
          title: `Finance test ${n} ${run}`,
          status: "submitted",
          public_id: `JHTCS-F${run}-${n}`,
        })
        .select("id")
        .single()
    ).data!.id;
  ids.subA = await sub("A");
  ids.subB = await sub("B");
  const now = new Date().toISOString();
  const pay = (
    reference: string,
    submission: string,
    fee: string,
    status: string,
    amount: number,
    raw: object | null,
  ) => ({
    reference,
    submission_id: submission,
    author_id: ids.author,
    fee_type: fee,
    status,
    amount_kobo: amount,
    paid_at: status === "success" ? now : null,
    channel: status === "success" ? "card" : null,
    raw,
  });
  const { data, error } = await db
    .from("payments")
    .insert([
      // Matches Paystack exactly.
      pay(ref("OK"), ids.subA, "review", "success", 500_000, { mock: true, outcome: "success", amount_kobo: 500_000 }),
      // Marked paid here, never seen by Paystack.
      pay(ref("GHOST"), ids.subA, "publication", "success", 2_000_000, null),
      // Paystack received a different amount.
      pay(ref("AMOUNT"), ids.subB, "review", "success", 500_000, {
        mock: true,
        outcome: "success",
        amount_kobo: 400_000,
      }),
      // A bank transfer whose receipt is waiting to be checked.
      {
        ...pay(ref("TRANSFER"), ids.subB, "publication", "pending", 2_000_000, null),
        channel: "bank_transfer",
        proof_path: `proofs/${ids.subB}/publication-1-receipt.png`,
        proof_name: "receipt.png",
        transfer_payer: "Sample Payer",
        transfer_date: now.slice(0, 10),
        proof_submitted_at: now,
      },
    ])
    .select("id, reference");
  if (error) throw error;
  for (const p of data!) ids[p.reference] = p.id;
});

test.afterAll(async () => {
  const db = sb();
  const paymentIds = Object.entries(ids)
    .filter(([k]) => k.includes(run))
    .map(([, v]) => v);
  await db.from("refunds").delete().in("payment_id", paymentIds);
  await db.from("payments").delete().in("id", paymentIds);
  await db.from("submissions").delete().in("id", [ids.subA, ids.subB]);
});

test("the Finance Officer filters payments and exports CSV and PDF", async ({ page }) => {
  await signIn(page, "finance");
  await page.goto(`/admin/payments?from=${today}&to=${today}&fee=review`);
  await expect(page.getByRole("link", { name: ref("OK") })).toBeVisible();
  await expect(page.getByRole("link", { name: ref("GHOST") })).toHaveCount(0); // publication fee, filtered out
  await expect(page.getByRole("heading", { name: "By month" })).toBeVisible();

  const csv = await page.request.get(`/api/finance/export?format=csv&from=${today}&to=${today}&fee=review`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(csv.headers()["content-disposition"]).toMatch(/attachment; filename="JHTCS_payments_.*\.csv"/);
  const text = await csv.text();
  expect(text.startsWith("﻿Reference,Fee,Status,Amount (NGN)")).toBe(true);
  expect(text).toContain(`${ref("OK")},Review fee,Paid,5000.00,0.00,5000.00`);
  expect(text).not.toContain(ref("GHOST"));

  const pdf = await page.request.get(`/api/finance/export?format=pdf&from=${today}&to=${today}`);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const fund = await page.request.get("/api/finance/export?kind=fund&format=pdf");
  expect((await fund.body()).subarray(0, 5).toString()).toBe("%PDF-");

  const { data: audit } = await sb()
    .from("audit_log")
    .select("id")
    .eq("action", "finance_export")
    .eq("actor_id", ids.finance);
  expect(audit?.length).toBe(3);
});

test("the Finance Officer records a partial refund", async ({ page }) => {
  await signIn(page, "finance");
  await page.goto(`/admin/payments/${ids[ref("OK")]}`);
  await page.getByLabel("Amount (₦)").fill("1500");
  await page.getByLabel("Transfer reference").fill(`RF-${run}`);
  await page.getByLabel("Reason").fill("Charged twice by the bank; partial refund agreed.");
  await page.getByRole("button", { name: "Record refund" }).click();
  await expect(page.getByText("Refund recorded.")).toBeVisible();
  await expect(page.getByText("Charged twice by the bank")).toBeVisible();
  await expect(page.getByText("₦3,500", { exact: true })).toBeVisible(); // net
  // The form won't offer more than is left (the database refuses it too: see rls_smoke.sql).
  const amount = page.getByLabel("Amount (₦)");
  await expect(amount).toHaveAttribute("max", "3500");
  await amount.fill("5000");
  expect(await amount.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false);
});

test("a bank transfer waiting to be checked is listed and confirmed by Finance", async ({ page }) => {
  await signIn(page, "finance");
  await page.goto("/admin/payments");
  const waiting = page.getByRole("region", { name: /bank transfers? to confirm/ });
  await expect(waiting.getByRole("link", { name: ref("TRANSFER") })).toBeVisible();
  await waiting.getByRole("link", { name: ref("TRANSFER") }).click();
  await expect(page.getByText("Sample Payer")).toBeVisible();
  await expect(page.getByRole("link", { name: /Open the transfer receipt/ })).toBeVisible();
  await page.getByRole("button", { name: "Confirm payment received" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm payment" }).click();
  await expect(page.getByText(/Payment confirmed/)).toBeVisible({ timeout: 15_000 });
  const { data } = await sb()
    .from("payments")
    .select("status, receipt_number, channel, confirmed_by")
    .eq("id", ids[ref("TRANSFER")])
    .single();
  expect(data).toMatchObject({ status: "success", channel: "bank_transfer" });
  expect(data?.receipt_number).toMatch(/^JHTCS-R-/);
  expect(data?.confirmed_by).toBe(ids.finance);
});

test("editors view finance but cannot export or refund; authors are kept out", async ({ page }) => {
  await signIn(page, "editor");
  await page.goto("/admin/payments");
  await expect(page.getByRole("heading", { name: "Payments", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
  expect((await page.request.get("/api/finance/export?format=csv")).status()).toBe(403);
  await page.goto(`/admin/payments/${ids[ref("AMOUNT")]}`);
  await expect(page.getByRole("button", { name: "Record refund" })).toHaveCount(0);

  await signIn(page, "author");
  await page.goto("/admin/payments");
  await expect(page).toHaveURL(/\/account/);
  expect((await page.request.get("/api/finance/export?format=csv")).status()).toBe(403);
});
