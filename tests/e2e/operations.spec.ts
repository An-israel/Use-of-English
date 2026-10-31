import { readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

// The System screen shows the newest migration applied.
const latestMigration = readdirSync("supabase/migrations").sort().at(-1)!.split("_")[0];

/**
 * Milestone 9: the System and audit screens, failed-job handling, live
 * notifications, daily maintenance, backup reports, the email webhook, the
 * public API and bulk PDF uploads. Everything created is removed afterwards.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON = process.env.CRON_SECRET;
test.skip(!URL_ || !KEY || !CRON, "requires Supabase and CRON_SECRET");
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");
test.describe.configure({ mode: "serial" });

const sb = () => createClient(URL_!, KEY!, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const pw = "operations-test-password-123";
const users = {
  admin: { email: `m9.admin.${run}@example.test`, role: "super_admin" },
  editor: { email: `m9.editor.${run}@example.test`, role: "editor" },
  reviewer: { email: `m9.reviewer.${run}@example.test`, role: "reviewer" },
} as const;
const ids: Record<string, string> = {};
const cron = { Authorization: `Bearer ${CRON}` };

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
      app_metadata: { jhts_role: u.role },
      user_metadata: { full_name: `${k} Sample ${run}` },
    });
    ids[k] = data.user!.id;
  }
});

test.afterAll(async () => {
  const db = sb();
  await db.from("dead_letter_jobs").delete().like("kind", `%${run}%`);
  await db.from("contact_messages").delete().like("subject", `%${run}%`);
  await db.from("backup_runs").delete().like("location", `%${run}%`);
  await db.from("email_suppressions").delete().like("email", `%${run}%`);
  if (ids.submission) await db.from("submissions").delete().eq("id", ids.submission);
  for (const a of ["a1", "a2"]) if (ids[a]) await db.from("articles").update({ pdf_path: null }).eq("id", ids[a]);
});

test("the System screen: health, failed jobs (retry and discard), schema version", async ({ page }) => {
  const db = sb();
  // A job that will succeed on retry (its event no longer exists), and one to discard.
  const { data: dl } = await db
    .from("dead_letter_jobs")
    .insert([
      {
        id: 9_000_000 + (parseInt(run.slice(-4), 36) % 100_000),
        queue: "default",
        kind: "dispatch_event",
        payload: { event_id: -1, note: run },
        attempts: 6,
        last_error: `simulated ${run}`,
        original_created_at: new Date().toISOString(),
      },
      {
        id: 9_200_000 + (parseInt(run.slice(-4), 36) % 100_000),
        queue: "default",
        kind: `obsolete_${run}`,
        payload: {},
        attempts: 6,
        last_error: "no handler",
        original_created_at: new Date().toISOString(),
      },
    ])
    .select("id");
  expect(dl?.length).toBe(2);

  await signIn(page, "admin");
  await page.goto("/admin/system");
  await expect(page.getByText("OK ·").first()).toBeVisible();
  await expect(page.getByText(new RegExp(latestMigration))).toBeVisible();
  const retryRow = page.getByRole("listitem").filter({ hasText: `simulated ${run}` });
  await retryRow.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText(/Job retried and completed|queued again/)).toBeVisible();
  const discardRow = page.getByRole("listitem").filter({ hasText: `obsolete_${run}` });
  await discardRow.getByRole("button", { name: "Discard" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard" }).click();
  await expect(page.getByText("Failed job discarded.")).toBeVisible();
  expect((await db.from("dead_letter_jobs").select("id").like("kind", `%${run}%`)).data).toHaveLength(0);

  await page.goto("/admin/audit?action=insert");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "insert" }).first()).toBeVisible();
});

test("staff see a notification when a contact message arrives", async ({ page }) => {
  await signIn(page, "editor");
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  await sb()
    .from("contact_messages")
    .insert({
      name: "Notify Test",
      email: "n@example.test",
      subject: `Proposal ${run}`,
      message: "A message to notify the editors.",
    });
  // Realtime pushes it when available; otherwise reloading shows it.
  await page.reload();
  const bell = page.getByRole("button", { name: /Notifications, \d+ new/ });
  await expect(bell).toBeVisible({ timeout: 15_000 });
  await bell.click();
  await expect(page.getByRole("dialog").getByText(`Proposal ${run}`)).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: /New message from the contact form/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/messages$/);
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toBeVisible();
});

test("daily maintenance reminds reviewers and clears orphaned uploads", async ({ request }) => {
  const db = sb();
  const { data: author } = await db.from("profiles").select("id").eq("role", "author").limit(1).single();
  const { data: sub } = await db
    .from("submissions")
    .insert({
      author_id: author!.id,
      type: "research_article",
      title: `Reminder test ${run}`,
      status: "under_peer_review",
    })
    .select("id")
    .single();
  ids.submission = sub!.id;
  const { data: ra } = await db
    .from("review_assignments")
    .insert({
      submission_id: sub!.id,
      reviewer_id: ids.reviewer,
      status: "accepted",
      due_at: new Date(Date.now() + 86_400_000).toISOString(),
    })
    .select("id")
    .single();
  const orphan = `articles/orphan-${run}/v1-left-behind.pdf`;
  await db.storage.from("published").upload(orphan, Buffer.from("%PDF-1.4 orphan"), { contentType: "application/pdf" });
  await db.from("pending_uploads").insert({
    storage_path: orphan,
    bucket: "published",
    created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  });

  const res = await request.get("/api/cron/daily", { headers: cron });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.reminders).toBeGreaterThanOrEqual(1);
  expect(body.orphans).toBeGreaterThanOrEqual(1);
  expect((await db.from("pending_uploads").select("storage_path").eq("storage_path", orphan)).data).toHaveLength(0);
  expect((await db.storage.from("published").list(`articles/orphan-${run}`)).data).toHaveLength(0);
  await expect
    .poll(
      async () =>
        (await db.from("email_outbox").select("id").eq("template", "review_reminder").eq("related_id", ra!.id)).data
          ?.length ?? 0,
      { timeout: 15_000 },
    )
    .toBe(1);
  // Running again the same day sends nothing new.
  await request.get("/api/cron/daily", { headers: cron });
  expect(
    (await db.from("email_outbox").select("id").eq("template", "review_reminder").eq("related_id", ra!.id)).data,
  ).toHaveLength(1);
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
});

test("backup reports, the email webhook and the public API", async ({ page, request }) => {
  const report = await request.post("/api/cron/backup-report", {
    headers: cron,
    data: { status: "ok", location: `gdrive:JHTS-backups/test-${run}`, details: { test: true } },
  });
  expect(report.status()).toBe(200);
  await signIn(page, "admin");
  await page.goto("/admin/system");
  await expect(page.getByText("Last off-site backup:")).toBeVisible();

  // Bounce webhook: unsigned is refused, signed suppresses the address.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  test.skip(!secret, "RESEND_WEBHOOK_SECRET not set");
  const to = `bounce.${run}@example.test`;
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: `em_${run}`, to: [to] } });
  expect(
    (
      await request.post("/api/webhooks/email", { data: body, headers: { "content-type": "application/json" } })
    ).status(),
  ).toBe(401);
  const id = `msg_${run}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", Buffer.from(secret!.replace(/^whsec_/, ""), "base64"))
    .update(`${id}.${ts}.${body}`)
    .digest("base64");
  const ok = await request.post("/api/webhooks/email", {
    data: body,
    headers: { "content-type": "application/json", "svix-id": id, "svix-timestamp": ts, "svix-signature": `v1,${sig}` },
  });
  expect(ok.status()).toBe(200);
  expect((await sb().from("email_suppressions").select("reason").eq("email", to).single()).data?.reason).toBe(
    "bounced",
  );

  const api = await request.get("/api/v1/articles?volume=1");
  expect(api.status()).toBe(200);
  expect(api.headers()["access-control-allow-origin"]).toBe("*");
  expect(api.headers()["x-api-version"]).toBe("1");
  const json = await api.json();
  expect(json.meta.total).toBeGreaterThan(0);
  expect(json.data[0]).toHaveProperty("url");
  expect((await request.get("/api/v1/articles?page=0")).status()).toBe(422);
  expect((await request.get("/api/v1/issues")).status()).toBe(200);
});

test("bulk PDF upload, three at a time", async ({ page }) => {
  const db = sb();
  const { data: arts } = await db
    .from("articles")
    .select("id, slug, issue_id")
    .in("slug", ["oral-history-and-the-nigerian-civil-war-archive", "museum-labels-and-the-language-of-restitution"]);
  ids.a1 = arts![0].id;
  ids.a2 = arts![1].id;
  await signIn(page, "admin");
  await page.goto(`/admin/issues/${arts![0].issue_id}`);
  await page.waitForLoadState("networkidle");
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  );
  await page.getByLabel("Choose PDFs for several articles").setInputFiles([
    { name: "Oral_History_Nigerian_Civil_War.pdf", mimeType: "application/pdf", buffer: pdf },
    { name: "museum-labels-restitution-final.pdf", mimeType: "application/pdf", buffer: pdf },
    { name: "scan0001.pdf", mimeType: "application/pdf", buffer: pdf },
  ]);
  const queue = page.getByRole("list", { name: "Upload queue" });
  await expect(queue.getByRole("combobox", { name: "Article for scan0001.pdf" })).toHaveValue("");
  await page.getByRole("button", { name: "Upload 2 PDFs" }).click();
  await expect(page.getByText("2 of 2 PDFs uploaded.")).toBeVisible({ timeout: 20_000 });
  const { data: after } = await db.from("articles").select("pdf_path").in("id", [ids.a1, ids.a2]);
  expect(after?.every((a) => a.pdf_path)).toBe(true);
});
