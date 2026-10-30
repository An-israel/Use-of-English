import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * Finance (brief section 7.3): the payments table, exports, refunds,
 * reconciliation and who may do what. Needs Supabase and PAYSTACK_MODE=mock,
 * where "Paystack" is the record the simulated checkout leaves on each payment.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL_ || !KEY || process.env.PAYSTACK_MODE !== "mock", "requires Supabase and PAYSTACK_MODE=mock");
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
const ref = (n: string) => `JHTS-T${run}-${n}`;
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
          public_id: `JHTS-F${run}-${n}`,
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
      // Paystack took the money; our webhook never arrived.
      pay(ref("MISSED"), ids.subB, "publication", "pending", 2_000_000, { mock_outcome: "success" }),
    ])
    .select("id, reference");
  if (error) throw error;
  for (const p of data!) ids[p.reference] = p.id;
});

test.afterAll(async () => {
  const db = sb();
  await db.from("reconciliation_flags").delete().like("paystack_reference", `%${run}%`);
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
  expect(csv.headers()["content-disposition"]).toMatch(/attachment; filename="JHTS_payments_.*\.csv"/);
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
  await page.getByLabel("Paystack refund reference").fill(`RF-${run}`);
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

test("reconciliation flags every kind of mismatch and can be resolved", async ({ page }) => {
  await signIn(page, "finance");
  await page.goto("/admin/reconciliation");
  await page.getByLabel("Day (Lagos time)").fill(today);
  await page.getByRole("button", { name: "Check this day" }).click();
  await expect(page.getByText(new RegExp(`${today}: \\d+ mismatch`))).toBeVisible({ timeout: 20_000 });

  const { data: flags } = await sb()
    .from("reconciliation_flags")
    .select("kind, paystack_reference")
    .like("paystack_reference", `%${run}%`);
  expect(flags?.map((f) => `${f.kind}:${f.paystack_reference}`).sort()).toEqual(
    [
      `amount_mismatch:${ref("AMOUNT")}`,
      `missing_in_paystack:${ref("GHOST")}`,
      `status_mismatch:${ref("MISSED")}`,
    ].sort(),
  );

  // Running the same day again adds nothing.
  await page.getByRole("button", { name: "Check this day" }).click();
  await expect(page.getByText(/\(0 new\)/)).toBeVisible({ timeout: 20_000 });

  const card = page.getByRole("article").filter({ hasText: ref("GHOST") });
  await expect(card.getByText("Marked paid here, not found on Paystack")).toBeVisible();
  await card.getByLabel("What was done").fill("Test row inserted by hand; no money involved.");
  await card.getByRole("button", { name: "Mark resolved" }).click();
  await expect(page.getByText("Marked as resolved.")).toBeVisible();
  await page.goto("/admin/reconciliation?show=resolved");
  await expect(page.getByText("Test row inserted by hand; no money involved.")).toBeVisible();
});

test("editors view finance but cannot export or refund; authors are kept out", async ({ page }) => {
  await signIn(page, "editor");
  await page.goto("/admin/payments");
  await expect(page.getByRole("heading", { name: "Payments", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Export CSV" })).toHaveCount(0);
  expect((await page.request.get("/api/finance/export?format=csv")).status()).toBe(403);
  await page.goto(`/admin/payments/${ids[ref("AMOUNT")]}`);
  await expect(page.getByRole("button", { name: "Record refund" })).toHaveCount(0);
  await page.goto("/admin/reconciliation");
  await expect(page.getByRole("button", { name: "Check this day" })).toHaveCount(0);

  await signIn(page, "author");
  await page.goto("/admin/payments");
  await expect(page).toHaveURL(/\/account/);
  expect((await page.request.get("/api/finance/export?format=csv")).status()).toBe(403);
});
