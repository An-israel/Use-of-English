import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

/**
 * The admin dashboard and the reviewer's side of peer review, against a real
 * Supabase stack. Everything these tests create is removed afterwards.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skip(!URL_ || !KEY, "requires Supabase");
test.skip(({ isMobile }) => isMobile, "runs once, on desktop");
test.describe.configure({ mode: "serial" });

const sb = () => createClient(URL_!, KEY!, { auth: { persistSession: false } });
const run = Date.now().toString(36);
const pw = "admin-test-password-123";
const users = {
  admin: { email: `m6.admin.${run}@example.test`, role: "super_admin", name: "Ada Sample Admin" },
  editor: { email: `m6.editor.${run}@example.test`, role: "editor", name: "Emeka Sample Editor" },
  reviewer: { email: `m6.reviewer.${run}@example.test`, role: "reviewer", name: "Rita Sample Reviewer" },
  author: { email: `m6.author.${run}@example.test`, role: "author", name: "Obi Sample Author" },
} as const;
const ids: Record<string, string> = {};
const YEAR = 2040 + (parseInt(run.slice(-3), 36) % 100);
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function signIn(page: Page, who: keyof typeof users) {
  // This suite signs in more often than the login rate limit allows from one address.
  await sb().from("rate_limit_buckets").delete().neq("key", "");
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Email").fill(users[who].email);
  await page.getByLabel("Password", { exact: true }).fill(pw);
  await Promise.all([page.waitForURL(/\/account/), page.getByRole("button", { name: "Sign in" }).click()]);
}

/** Click a button that opens a confirmation dialog, then confirm. */
async function confirm(page: Page, trigger: string | RegExp, confirmLabel?: string) {
  await page.getByRole("button", { name: trigger }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel ?? trigger }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

test.beforeAll(async () => {
  const db = sb();
  await db.from("rate_limit_buckets").delete().neq("key", "");
  for (const [k, u] of Object.entries(users)) {
    const { data } = await db.auth.admin.createUser({
      email: u.email,
      password: pw,
      email_confirm: true,
      app_metadata: u.role === "author" ? {} : { jhts_role: u.role },
      user_metadata: { full_name: u.name },
    });
    ids[k] = data.user!.id;
  }
  await db
    .from("profiles")
    .update({ expertise: ["Igbo proverbs", "pragmatics"] })
    .eq("id", ids.reviewer);
  // A screened submission waiting for reviewers, with its manuscript in Storage.
  const { data: cat } = await db.from("categories").select("id").limit(1).single();
  const { data: sub } = await db
    .from("submissions")
    .insert({
      author_id: ids.author,
      type: "research_article",
      category_id: cat!.id,
      title: `Market Proverbs and Meaning ${run}`,
      abstract: "An abstract about proverbs in Nsukka markets. ".repeat(20),
      keywords: ["proverbs", "markets", "Igbo"],
      citation_style: "apa7",
      status: "under_screening",
      public_id: `JHTS-T${run.slice(-6).toUpperCase()}`,
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  ids.submission = sub!.id;
  const path = `${sub!.id}/manuscript/v1-obi-author-manuscript.docx`;
  await db.storage
    .from("submissions")
    .upload(path, Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(1024, 1)]), { contentType: DOCX });
  await db.from("submission_files").insert({
    submission_id: sub!.id,
    kind: "manuscript",
    version: 1,
    storage_path: path,
    original_name: "obi-author-manuscript.docx",
    mime_type: DOCX,
    size_bytes: 1028,
    uploaded_by: ids.author,
  });
});

test.afterAll(async () => {
  const db = sb();
  await db.from("articles").delete().like("slug", `%${run}%`);
  if (ids.issue) await db.from("issues").delete().eq("id", ids.issue);
  await db.from("volumes").delete().eq("year", YEAR);
  await db.from("categories").delete().like("slug", `%${run}%`);
  if (ids.submission) await db.from("submissions").delete().eq("id", ids.submission);
  await db.from("pages").delete().like("slug", `%${run}%`);
});

test("the admin shell: overview, quick actions, collapsible sidebar", async ({ page }) => {
  await signIn(page, "editor");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
  await expect(page.getByText("Open submissions").first()).toBeVisible();

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  await palette.getByRole("combobox").fill("categ");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/categories$/);
  await expect(page.getByRole("heading", { name: "Categories", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Collapse the sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand the sidebar" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Expand the sidebar" })).toBeVisible();
  await page.getByRole("button", { name: "Expand the sidebar" }).click();

  // Editors don't see Settings; the page itself refuses them too.
  await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: "Settings" })).toHaveCount(0);
});

test("submissions: filters, saved filters and the kanban board", async ({ page }) => {
  await signIn(page, "editor");
  await page.goto("/admin/submissions");
  await page.getByRole("searchbox", { name: "Search" }).fill(run);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("link", { name: `Market Proverbs and Meaning ${run}` })).toBeVisible();
  await page.getByRole("button", { name: "+ Save current filter" }).click();
  await page.getByLabel("Filter name").fill("Test run");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("link", { name: "Test run" })).toBeVisible();

  await page.getByRole("link", { name: "Board", exact: true }).click();
  const column = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Under screening" }) });
  await expect(column.getByText(`Market Proverbs and Meaning ${run}`)).toBeVisible();
  await page.getByRole("button", { name: "Remove saved filter Test run" }).click();
  await expect(page.getByRole("link", { name: "Test run" })).toHaveCount(0);
});

test("peer review: invite, accept, review, share comments", async ({ page }) => {
  await signIn(page, "editor");
  await page.goto(`/admin/submissions/${ids.submission}`);
  await page.getByLabel("Similarity (%)").fill("7.5");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.getByText("Editorial details saved.")).toBeVisible();

  await page
    .getByLabel(/^Reviewer/)
    .selectOption({ label: `${users.reviewer.name} · ${users.reviewer.email} · 0 active` });
  await expect(page.getByText("Expertise: Igbo proverbs, pragmatics")).toBeVisible();
  await page.getByRole("button", { name: "Invite reviewer" }).click();
  await expect(page.getByText(`${users.reviewer.name} has been invited by email.`)).toBeVisible();
  await expect(page.getByText("Under peer review").first()).toBeVisible();

  // The invitation email goes through the queue.
  const db = sb();
  await expect
    .poll(
      async () =>
        (
          await db
            .from("email_outbox")
            .select("id")
            .eq("template", "review_invitation")
            .eq("to_email", users.reviewer.email)
        ).data?.length ?? 0,
      { timeout: 20_000 },
    )
    .toBeGreaterThan(0);

  await signIn(page, "reviewer");
  await page.goto("/account");
  await page.getByRole("link", { name: `Market Proverbs and Meaning ${run}` }).click();
  await expect(page.getByText("Accept the invitation to download")).toBeVisible();
  await expect(page.getByText(users.author.name)).toHaveCount(0);
  await page.getByRole("button", { name: "Accept and review" }).click();
  const manuscript = page.getByRole("link", { name: "Manuscript v1" });
  await expect(manuscript).toBeVisible();
  expect(await manuscript.getAttribute("href")).toContain("as=review");

  await page.getByLabel("Minor revisions").check();
  await page
    .getByLabel(/Comments for the author/)
    .fill(
      "A careful study. The section on market pidgin needs more examples, and the conclusion should return to the opening proverb.",
    );
  await page.getByLabel(/Confidential comments/).fill("I know this field well; no conflict of interest.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.")).toBeVisible();
  await confirm(page, "Submit review");
  await expect(page.getByRole("heading", { name: "Your review" })).toBeVisible();
  await expect(page.getByText("Review submitted", { exact: true })).toBeVisible();

  await signIn(page, "editor");
  await page.goto(`/admin/submissions/${ids.submission}`);
  await expect(page.getByText("Minor revisions", { exact: true })).toBeVisible();
  await expect(page.getByText("no conflict of interest")).toBeVisible();
  await confirm(page, "Share comments with author", "Share comments");
  await expect(page.getByText("Reviewer 1 comments:", { exact: false }).first()).toBeVisible();
});

test("issues: create a volume, edit the editorial, schedule, preview", async ({ page }) => {
  await signIn(page, "editor");
  await page.goto("/admin/issues");
  await page.getByLabel("Year").fill(String(YEAR));
  await page.getByRole("button", { name: "Create volume" }).click();
  await expect(page.getByText("Issue 1 created as a draft.")).toBeVisible();
  const link = page.getByRole("link", { name: `Volume`, exact: false }).filter({ hasText: `(March ${YEAR})` });
  await link.click();
  await page.waitForURL(/\/admin\/issues\/[0-9a-f-]{36}$/);
  ids.issue = page.url().split("/").pop()!;

  await page.getByLabel("Title (optional)").fill(`Language and Belonging ${run}`);
  await page.getByRole("textbox", { name: "Editorial" }).click();
  await page.keyboard.type("Welcome to this issue of the journal.");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Issue saved.")).toBeVisible();

  await page.getByLabel("Publish on (Lagos time)").fill(`${YEAR}-03-01T09:00`);
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByText("Issue scheduled. It will publish automatically.")).toBeVisible();
  await page.getByRole("button", { name: "Cancel the schedule" }).click();
  await expect(page.getByText("Schedule cancelled; the issue is a draft again.")).toBeVisible();

  await page.getByRole("link", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: `Language and Belonging ${run}` })).toBeVisible();
  await expect(page.getByText("Welcome to this issue of the journal.")).toBeVisible();
});

test("articles: create, authors, full text, publish In Press, move into an issue, bin and restore", async ({
  page,
}) => {
  await signIn(page, "editor");
  await page.goto("/admin/articles/new");
  await page.getByLabel("Title").fill(`Translating Silence ${run}`);
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.waitForURL(/\/admin\/articles\/[0-9a-f-]{36}$/);

  await page.getByLabel("URL slug").fill(`translating-silence-${run}`);
  await page.getByLabel("Abstract").fill("How translators carry silence between Igbo and English.");
  await page.getByRole("button", { name: "Save changes" }).first().click();
  await expect(page.getByText(/Article saved/)).toBeVisible();

  await page.getByLabel("Name").first().fill("Amaka Sample Writer");
  await page.getByRole("button", { name: "Add author" }).click();
  await page.getByLabel("Name").nth(1).fill("Bayo Sample Second");
  await page.getByRole("button", { name: "Move author 2 up" }).click();
  await page.getByRole("button", { name: "Save authors" }).click();
  await expect(page.getByText("Authors saved.")).toBeVisible();
  await expect(page.getByLabel("Name").first()).toHaveValue("Bayo Sample Second");

  // Publishing needs a PDF or full text.
  await confirm(page, "Publish");
  await expect(page.getByText("Add the PDF or the full text before publishing")).toBeVisible();

  // Pasting from Word is cleaned.
  const editor = page.getByRole("textbox", { name: "Full text (HTML)" });
  await editor.click();
  await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Full text (HTML)"]')!;
    const data = new DataTransfer();
    data.setData(
      "text/html",
      '<p class="MsoNormal" style="mso-line-height:150%"><span lang="EN-GB">Silence is <i>also</i> speech.<o:p></o:p></span></p>',
    );
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect(editor.locator("em, i")).toHaveText("also");
  await page.getByRole("button", { name: "Save full text" }).click();
  await expect(page.getByText("Full text saved.")).toBeVisible();

  await confirm(page, "Publish");
  await expect(page.getByText("Online now as an Article in Press.")).toBeVisible();
  await page.goto(`/articles/translating-silence-${run}`);
  await expect(page.getByRole("heading", { name: `Translating Silence ${run}` })).toBeVisible();
  await expect(page.getByText("Silence is also speech.")).toBeVisible();

  // Assign to the draft issue: it stays online as In Press until the issue is out.
  await page.goto("/admin/in-press");
  const row = page.getByRole("row").filter({ hasText: `Translating Silence ${run}` });
  await row
    .getByLabel("Issue")
    .selectOption({ label: `Volume ${await volumeNumber()}, Issue 1 (March ${YEAR}) (draft)` });
  await row.getByRole("button", { name: "Move" }).click();
  await expect(page.getByText("Article added to the issue.")).toBeVisible();
  await page.goto(`/admin/issues/${ids.issue}`);
  await expect(page.getByRole("link", { name: `Translating Silence ${run}` })).toBeVisible();

  await page.goto("/admin/articles?q=" + run);
  await page.getByRole("link", { name: `Translating Silence ${run}` }).click();
  await confirm(page, "Move to the bin", "Move to bin");
  await page.waitForURL(/\/admin\/articles$/);
  await page.goto("/admin/articles?status=bin&q=" + run);
  await page.getByRole("button", { name: "Restore" }).click();
  await expect(page.getByText(/Article restored/)).toBeVisible();
});

async function volumeNumber(): Promise<number> {
  const { data } = await sb().from("volumes").select("number").eq("year", YEAR).single();
  return data!.number;
}

test("categories, pages with version history, and an edit conflict", async ({ page, browser }) => {
  await signIn(page, "editor");
  await page.goto("/admin/categories");
  const add = page.locator("main aside");
  await add.getByLabel("Name", { exact: true }).fill(`Oral Traditions ${run}`);
  await add.getByLabel("URL slug").fill(`oral-traditions-${run}`);
  await add.getByRole("radio", { name: "translation" }).check({ force: true });
  await add.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByText("Category added.")).toBeVisible();
  await page.getByRole("button", { name: `Move Oral Traditions ${run} up` }).click();
  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByText("Order saved.")).toBeVisible();

  // Pages: a new policy, live preview, and the version history.
  await page.goto("/admin/pages");
  await page.locator("main aside").getByLabel("Title").fill(`Test Policy ${run}`);
  await page.getByRole("button", { name: "Create" }).click();
  await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
  await page.getByRole("textbox", { name: "Text", exact: true }).click();
  await page.keyboard.type("The first version.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Page saved/)).toBeVisible();
  const pageUrl = page.url();
  const text = page.getByRole("textbox", { name: "Text", exact: true });
  await text.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(` Added by test ${run}.`);
  await expect(page.getByRole("region", { name: "Live preview" }).getByText(`Added by test ${run}.`)).toBeVisible();

  // A second editor saves first: this save must be refused, not overwrite theirs.
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await signIn(p2, "admin");
  await p2.goto(pageUrl);
  await p2.getByLabel("Summary").fill(`Summary by the admin ${run}`);
  await p2.getByRole("button", { name: "Save changes" }).click();
  await expect(p2.getByText(/Page saved/)).toBeVisible();
  await other.close();

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Someone else saved this" })).toBeVisible();
  await page.getByRole("button", { name: "Reload now" }).click();
  await expect(page.getByLabel("Summary")).toHaveValue(`Summary by the admin ${run}`);
  await expect(page.getByRole("heading", { name: "Version history" })).toBeVisible();
  await expect(page.getByText(`Test Policy ${run}`).last()).toBeVisible();
  // "Reload now" reloads the whole page: a click before hydration does nothing, so retry until the dialog opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Restore" }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole("dialog").getByRole("button", { name: "Restore" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText(/restored/)).toBeVisible();
});

test("settings: a Super Admin toggles a feature flag", async ({ page }) => {
  await signIn(page, "admin");
  await page.goto("/admin/settings");
  await expect(page.getByText("Schema version")).toBeVisible();
  const flag = page.getByRole("switch", { name: "Show the latest book reviews on the home page" });
  const before = await flag.getAttribute("aria-checked");
  await flag.click();
  await expect(flag).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
  await flag.click();
  await expect(flag).toHaveAttribute("aria-checked", before!);

  await signIn(page, "editor");
  await page.goto("/admin/settings");
  await expect(page).not.toHaveURL(/\/admin\/settings$/);
});

test("rich text the visual editor can't keep opens as HTML, untouched", async ({ page }) => {
  const { data } = await sb().from("articles").select("id").like("body_html", "%<table%").limit(1).single();
  await signIn(page, "editor");
  await page.goto(`/admin/articles/${data!.id}`);
  const source = page.getByRole("textbox", { name: "Full text (HTML)" });
  await expect(source).toHaveValue(/<table/);
  await expect(page.getByText(/HTML mode: this text has tables/)).toBeVisible();
  await page.getByRole("button", { name: "Visual", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Switch to the visual editor?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(source).toHaveValue(/<table/);
});
