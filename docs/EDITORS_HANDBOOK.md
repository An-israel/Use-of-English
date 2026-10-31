# Editor’s Handbook

<!-- Generated from src/content/handbook.ts by `npm run handbook:generate`. Edit that file, not this one. -->

How to run JHTS day to day: handling submissions, publishing issues, waivers and refunds. No technical knowledge needed. Every button named here is on the screen exactly as written.

The same guide is in the editorial office under **Handbook**.

## Contents

- [Getting started](#getting-started)
- [Handling a submission](#handling-a-submission)
- [Publishing an issue](#publishing-an-issue)
- [Waivers](#waivers)
- [Refunds](#refunds)
- [Payments and reconciliation](#payments-and-reconciliation)
- [Pages, the board and messages](#pages-the-board-and-messages)
- [When something goes wrong](#when-something-goes-wrong)

## Getting started

Sign in at the journal’s website with the email address you were invited with, then choose **Open the admin dashboard** on your account page, or go straight to [/admin](https://jhts.unn.edu.ng/admin).

- **Super Admin**: everything, including users, settings and the System screen.
- **Editor**: submissions, reviewers, issues, articles, pages, the board and messages. Editors can see payments but not record refunds.
- **Book Review Editor**: book reviews.
- **Finance Officer**: payments, refunds, reconciliation and the fund summary.
- **Reviewer**: only the manuscripts they are asked to review.

Press **Ctrl + K** (or **⌘ + K** on a Mac) anywhere in the editorial office to jump to a screen or start a common task. The bell at the top of the sidebar shows new submissions, payments, reviews and messages for your role.

> Nothing is lost by accident: anything you remove goes to a bin you can restore from, pages keep every earlier version, and if two people edit the same thing at once the second save is stopped with a message instead of overwriting the first.

## Handling a submission

Every submission has a public ID such as JHTS-2027-0042. Authors see its status on their dashboard and get an email each time it changes.

1. Open [Submissions](https://jhts.unn.edu.ng/admin/submissions). New manuscripts arrive as **Submitted** once the review fee is paid or waived. Use the table, or switch to the board to see every status at once.
2. Open the submission. Read the abstract and files, and set the handling editor under **Editorial details**.
3. Under **Change status**, choose **Under screening**, then **Plagiarism check**. Record the similarity percentage and upload the report under **Editorial details**.
4. Under **Peer review**, use **Invite a reviewer**. Pick the reviewer (their email is shown so you choose the right person) and a due date. The reviewer is emailed and sees the manuscript without the authors’ names.
5. Reviewers get reminders two days before the due date and when a review is overdue. If needed, use **Extend by 7 days** or **Cancel review**.
6. When reviews are in, read them under **Peer review**. Comments marked confidential are never shown to the author. To pass a reviewer’s comments on, use **Share comments**: they go to the author anonymously.
7. Make the decision under **Change status**: **Revisions requested**, **Accepted, awaiting publication fee**, or **Rejected** (give the reason the author will see). Add a message to the author if you wish; it is emailed with the decision.
8. Once the publication fee is paid (or waived), the submission moves to **In production** and the author can download the acceptance letter.
9. Use **Create article from submission** to start the article with its title, abstract, keywords and authors already filled in. Then continue with “Publishing an issue” below.

Use **Message or note** for anything you want on record. Choose whether it goes to the author (emailed) or stays internal for the editors.

## Publishing an issue

JHTS publishes quarterly: March, June, September and December.

1. Go to [Issues](https://jhts.unn.edu.ng/admin/issues) and choose **Create the next issue**. The volume, number and month are filled in for you.
2. Under **Details and editorial**, check the details and write the editorial.
3. Under **Cover**, upload a cover image, or leave it empty to use the journal’s generated cover.
4. Add articles. Open each article in [Articles](https://jhts.unn.edu.ng/admin/articles) and, under **Placement**, choose this issue in the **Issue** list. Check the details, the authors in order, the full text and the page range.
5. Upload the PDFs. Either upload each one on its article under **Files**, or use **Article PDFs** on the issue to drop several at once: each file is matched to an article by its name, and you can correct any match before uploading.
6. Under **Contents**, drag the articles into the order they appear in the issue.
7. Upload the whole-issue PDF under **Full-issue files** if there is one.
8. When JHTS has a DOI prefix, use **Assign DOIs** under **DOIs and Crossref**, then download the Crossref file and upload it at Crossref.
9. Preview the issue. Then choose **Publish now**, or set a date and time under **Schedule** and the site publishes it for you (Lagos time).

> If something is wrong after publishing, choose **Unpublish**, fix it and publish again. Readers who already downloaded a file keep their copy; the site serves the corrected one from then on.

**Articles in Press**: an accepted article can go online before its issue. Under the article’s **Placement**, choose **No issue (Article in Press)** and publish it. When the issue is ready, choose the issue there instead; the article keeps its address and moves into the issue.

## Waivers

Editors can waive the review fee or the publication fee for a submission, for example for authors from institutions the committee has agreed to support. [TO CONFIRM: the committee’s waiver policy]

1. Open the submission in [Submissions](https://jhts.unn.edu.ng/admin/submissions).
2. Under **Waive a fee**, choose **Review fee** or **Publication fee**.
3. Write the reason. It is kept on record and appears in the payments ledger.
4. Choose **Waive fee**. A waived review fee sends the manuscript to the editors straight away; a waived publication fee moves it into production. The author is emailed about the new status.

Waivers appear in [Payments](https://jhts.unn.edu.ng/admin/payments) with the status **Waived**, the reason and who granted it, so the fund statement always adds up. Fees can also be switched off for everyone in [Settings](https://jhts.unn.edu.ng/admin/settings).

## Refunds

Refunds are made in Paystack and then recorded on the website, so the journal’s accounts match the money. Only the Finance Officer or a Super Admin can record a refund.

1. In the Paystack dashboard, open the transaction (search for the payment reference) and refund it, in full or in part. Note the refund reference Paystack gives you.
2. On the website, open the payment in [Payments](https://jhts.unn.edu.ng/admin/payments).
3. Under **Record a refund**, enter the amount in naira, the date, the reason and the Paystack refund reference, then choose **Record refund**.
4. A full refund marks the payment **Refunded**. The site never lets the refunds add up to more than was paid.

> If an author says they paid but the website still shows the payment as pending, open the payment and choose **Check with Paystack**. It asks Paystack directly and updates the payment if the money arrived.

## Payments and reconciliation

- [Payments](https://jhts.unn.edu.ng/admin/payments): every payment, waiver and refund, with filters, totals by month and by fee, and CSV or PDF exports for the Bursary.
- [Reconciliation](https://jhts.unn.edu.ng/admin/reconciliation): every night the site compares the day’s Paystack transactions with its own records and flags any difference. Investigate each flag, then resolve it with a note. **Check a day now** re-checks any day.
- [Fund summary](https://jhts.unn.edu.ng/admin/fund-summary): money collected, refunded and net, by year and by fee, as PDF or CSV.

## Pages, the board and messages

- [Pages](https://jhts.unn.edu.ng/admin/pages): About, Aims and Scope, the author guidelines and the policies. Edit with the live preview beside you. Every save keeps the previous version under **Version history**; **Restore** brings one back.
- [Call for Papers](https://jhts.unn.edu.ng/admin/call-for-papers): the current call and its deadline, shown on the home page with a countdown.
- [Editorial board](https://jhts.unn.edu.ng/admin/board): members, photos, groups and terms. Drag to reorder.
- [Messages](https://jhts.unn.edu.ng/admin/messages): the contact form inbox. Mark messages read and archive them once answered.
- [Book reviews](https://jhts.unn.edu.ng/admin/book-reviews): reviews with the book’s details and cover.
- [Users](https://jhts.unn.edu.ng/admin/users): **Invite someone** to join as an editor, reviewer or finance officer. Authors register themselves.

Text marked **[TO CONFIRM]** on the public site is waiting for the committee’s wording. Replace it in Pages or Settings before launch.

## When something goes wrong

- **“Someone else saved this”**: another person changed the same item while you were editing. Choose **Reload now** to see their version, then make your change again.
- **“The editorial office can’t reach the database”**: a service is briefly down. Nothing you saved has been lost. Wait a minute and choose **Try again**.
- **An email didn’t arrive**: ask the person to check their spam folder. The Super Admin can see failed emails on the [System](https://jhts.unn.edu.ng/admin/system) screen and retry them.
- **A payment is stuck as pending**: open it and choose **Check with Paystack**.

For anything else, contact the Super Admin. Technical details for the Unit’s ICT support are in docs/RUNBOOK.md in the code repository.
