-- JHTS · 0600 · Row Level Security (section 6). Every rule the interface
-- shows is also enforced here. The service role bypasses RLS and is used only
-- by server code for webhooks, cron, invitations and payment writes.
-- Reversal: supabase/rollbacks/20261030000600_rls.down.sql

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'volumes', 'issues', 'categories', 'articles', 'article_authors', 'book_reviews',
    'slug_redirects', 'editorial_board_members', 'pages', 'page_versions', 'call_for_papers',
    'site_settings', 'feature_flags', 'submission_counters', 'submissions', 'submission_authors',
    'submission_files', 'submission_events', 'review_assignments', 'payments', 'refunds',
    'reconciliation_flags', 'domain_events', 'jobs', 'dead_letter_jobs', 'audit_log',
    'metrics_events', 'metrics_daily', 'rate_limit_buckets', 'cron_leases', 'contact_messages',
    'file_versions', 'pending_uploads'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Server-only tables: no client policies at all (service role only).
revoke all on public.submission_counters, public.domain_events, public.rate_limit_buckets,
  public.pending_uploads, public.metrics_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

create policy "profiles: staff read" on public.profiles
  for select to authenticated
  using (public.has_role('super_admin', 'editor', 'book_review_editor', 'finance_officer'));

create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles: super admin manages" on public.profiles
  for update to authenticated using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- Published content: public read, editorial write
-- ---------------------------------------------------------------------------

create policy "volumes: public read" on public.volumes for select using (true);
create policy "volumes: editorial write" on public.volumes for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "issues: public read published" on public.issues for select
  using (status = 'published' and deleted_at is null);
create policy "issues: editorial all" on public.issues for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "categories: public read" on public.categories for select using (not is_archived);
create policy "categories: editorial all" on public.categories for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "articles: public read" on public.articles for select
  using (deleted_at is null and status in ('published', 'in_press'));
create policy "articles: editorial all" on public.articles for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());
create policy "articles: book review editors" on public.articles for all to authenticated
  using (public.has_role('book_review_editor') and type = 'book_review')
  with check (public.has_role('book_review_editor') and type = 'book_review');

-- Author emails are private by default: the public may read every column but email.
revoke select on public.article_authors from anon, authenticated;
grant select (id, article_id, position, name, affiliation, orcid, is_corresponding, email_public)
  on public.article_authors to anon, authenticated;
grant insert, update, delete on public.article_authors to authenticated;

create policy "article_authors: read with article" on public.article_authors for select
  using (exists (select 1 from public.articles a where a.id = article_id));
create policy "article_authors: editorial write" on public.article_authors for all to authenticated
  using (public.is_editorial()
         or (public.has_role('book_review_editor')
             and exists (select 1 from public.articles a where a.id = article_id and a.type = 'book_review')))
  with check (public.is_editorial()
         or (public.has_role('book_review_editor')
             and exists (select 1 from public.articles a where a.id = article_id and a.type = 'book_review')));

-- Emails: shown publicly only when the author opted in; always to editors.
create or replace function public.article_author_emails(p_article uuid)
returns table (author_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select aa.id, aa.email::text from public.article_authors aa
  where aa.article_id = p_article
    and (aa.email_public or public.is_editorial() or public.has_role('book_review_editor'))
$$;

create policy "book_reviews: read with article" on public.book_reviews for select
  using (exists (select 1 from public.articles a where a.id = article_id));
create policy "book_reviews: editors write" on public.book_reviews for all to authenticated
  using (public.has_role('super_admin', 'editor', 'book_review_editor'))
  with check (public.has_role('super_admin', 'editor', 'book_review_editor'));

create policy "slug_redirects: public read" on public.slug_redirects for select using (true);
create policy "slug_redirects: editorial write" on public.slug_redirects for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "board: public read" on public.editorial_board_members for select using (deleted_at is null);
create policy "board: editorial all" on public.editorial_board_members for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "pages: public read" on public.pages for select using (is_published and deleted_at is null);
create policy "pages: editorial all" on public.pages for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "page_versions: editorial read" on public.page_versions for select to authenticated
  using (public.is_editorial());

create policy "cfp: public read active" on public.call_for_papers for select using (is_active);
create policy "cfp: editorial all" on public.call_for_papers for all to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "settings: public read" on public.site_settings for select using (is_public);
create policy "settings: super admin all" on public.site_settings for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

create policy "flags: public read" on public.feature_flags for select using (true);
create policy "flags: super admin write" on public.feature_flags for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- Submissions
-- ---------------------------------------------------------------------------

create policy "submissions: author reads own" on public.submissions for select to authenticated
  using (author_id = auth.uid());
create policy "submissions: managers read" on public.submissions for select to authenticated
  using (public.can_manage_submission(id) or public.has_role('finance_officer'));

-- Authors create and edit drafts only; every later status change goes through
-- the server (payments, editors) or the withdraw_submission() function.
create policy "submissions: author creates draft" on public.submissions for insert to authenticated
  with check (author_id = auth.uid() and status = 'draft' and public.has_role('author', 'editor', 'super_admin', 'book_review_editor'));
create policy "submissions: author edits draft" on public.submissions for update to authenticated
  using (author_id = auth.uid() and status = 'draft')
  with check (author_id = auth.uid() and status = 'draft');
create policy "submissions: managers update" on public.submissions for update to authenticated
  using (public.can_manage_submission(id)) with check (public.can_manage_submission(id));

create policy "submission_authors: author manages own draft" on public.submission_authors for all to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid() and s.status = 'draft'));
create policy "submission_authors: managers" on public.submission_authors for all to authenticated
  using (public.can_manage_submission(submission_id)) with check (public.can_manage_submission(submission_id));

create policy "submission_files: author reads own" on public.submission_files for select to authenticated
  using (visible_to_author and exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid()));
create policy "submission_files: author uploads" on public.submission_files for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and kind in ('manuscript', 'title_page', 'cover_letter', 'revision')
    and exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.author_id = auth.uid()
        and (s.status = 'draft' or (s.status = 'revisions_requested' and kind = 'revision'))
    )
  );
create policy "submission_files: managers" on public.submission_files for all to authenticated
  using (public.can_manage_submission(submission_id)) with check (public.can_manage_submission(submission_id));
create policy "submission_files: reviewers read manuscript" on public.submission_files for select to authenticated
  using (kind in ('manuscript', 'revision') and public.is_assigned_reviewer(submission_id));
create policy "submission_files: reviewers upload report" on public.submission_files for insert to authenticated
  with check (
    kind = 'review_report' and not visible_to_author and uploaded_by = auth.uid()
    and exists (select 1 from public.review_assignments ra
                where ra.submission_id = submission_files.submission_id
                  and ra.reviewer_id = auth.uid() and ra.status = 'accepted')
  );
create policy "submission_files: reviewers read own report" on public.submission_files for select to authenticated
  using (kind = 'review_report' and uploaded_by = auth.uid());

create policy "submission_events: author reads own" on public.submission_events for select to authenticated
  using (visibility = 'author' and exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid()));
create policy "submission_events: author messages" on public.submission_events for insert to authenticated
  with check (
    actor_id = auth.uid() and visibility = 'author' and from_status is null and to_status is null
    and exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid())
  );
create policy "submission_events: managers" on public.submission_events for all to authenticated
  using (public.can_manage_submission(submission_id)) with check (public.can_manage_submission(submission_id));

create policy "reviews: reviewer reads own" on public.review_assignments for select to authenticated
  using (reviewer_id = auth.uid());
create policy "reviews: reviewer responds" on public.review_assignments for update to authenticated
  using (reviewer_id = auth.uid()) with check (reviewer_id = auth.uid());
create policy "reviews: managers" on public.review_assignments for all to authenticated
  using (public.can_manage_submission(submission_id)) with check (public.can_manage_submission(submission_id));

-- ---------------------------------------------------------------------------
-- Money: clients only ever read. Writes come from the server.
-- ---------------------------------------------------------------------------

revoke insert, update, delete on public.payments from anon, authenticated;

create policy "payments: author reads own" on public.payments for select to authenticated
  using (author_id = auth.uid());
create policy "payments: finance and editors read" on public.payments for select to authenticated
  using (public.has_role('super_admin', 'finance_officer', 'editor'));

create policy "refunds: read" on public.refunds for select to authenticated
  using (public.has_role('super_admin', 'finance_officer', 'editor'));
create policy "refunds: finance records" on public.refunds for insert to authenticated
  with check (public.has_role('super_admin', 'finance_officer') and recorded_by = auth.uid());

create policy "reconciliation: read" on public.reconciliation_flags for select to authenticated
  using (public.has_role('super_admin', 'finance_officer', 'editor'));
create policy "reconciliation: finance resolves" on public.reconciliation_flags for update to authenticated
  using (public.has_role('super_admin', 'finance_officer'))
  with check (public.has_role('super_admin', 'finance_officer'));

-- ---------------------------------------------------------------------------
-- Operations
-- ---------------------------------------------------------------------------

create policy "jobs: super admin reads" on public.jobs for select to authenticated
  using (public.has_role('super_admin'));
create policy "dead letters: super admin" on public.dead_letter_jobs for select to authenticated
  using (public.has_role('super_admin'));
create policy "dead letters: super admin discards" on public.dead_letter_jobs for delete to authenticated
  using (public.has_role('super_admin'));
create policy "cron leases: super admin reads" on public.cron_leases for select to authenticated
  using (public.has_role('super_admin'));
create policy "audit: super admin reads" on public.audit_log for select to authenticated
  using (public.has_role('super_admin'));
revoke insert, update, delete on public.audit_log from anon, authenticated;

create policy "metrics_daily: staff read" on public.metrics_daily for select to authenticated
  using (public.has_role('super_admin', 'editor', 'book_review_editor'));

create policy "contact: editorial" on public.contact_messages for select to authenticated
  using (public.is_editorial());
create policy "contact: editorial update" on public.contact_messages for update to authenticated
  using (public.is_editorial()) with check (public.is_editorial());

create policy "file_versions: editorial" on public.file_versions for all to authenticated
  using (public.has_role('super_admin', 'editor', 'book_review_editor'))
  with check (public.has_role('super_admin', 'editor', 'book_review_editor'));

-- ---------------------------------------------------------------------------
-- Function privileges: server-only helpers are not callable from browsers.
-- ---------------------------------------------------------------------------

revoke execute on function
  public.claim_jobs(text, int, text),
  public.complete_job(bigint),
  public.fail_job(bigint, text),
  public.record_metric(text, uuid, uuid, text, text, text),
  public.rate_limit_hit(text, int, int),
  public.acquire_lease(text, text, int),
  public.release_lease(text, text, text, text),
  public.ensure_metrics_partition(date),
  public.rollup_metrics(date),
  public.increment_article_counter(uuid, text),
  public.next_submission_public_id(),
  public.next_receipt_number(),
  public.health_check(),
  public.schema_version(),
  public.handle_new_user()
from public, anon, authenticated;

grant execute on function
  public.claim_jobs(text, int, text),
  public.complete_job(bigint),
  public.fail_job(bigint, text),
  public.record_metric(text, uuid, uuid, text, text, text),
  public.rate_limit_hit(text, int, int),
  public.acquire_lease(text, text, int),
  public.release_lease(text, text, text, text),
  public.ensure_metrics_partition(date),
  public.rollup_metrics(date),
  public.increment_article_counter(uuid, text),
  public.next_submission_public_id(),
  public.next_receipt_number(),
  public.health_check(),
  public.schema_version()
to service_role;

revoke execute on function public.withdraw_submission(uuid, text), public.retry_dead_letter(bigint) from public, anon;
grant execute on function public.withdraw_submission(uuid, text), public.retry_dead_letter(bigint) to authenticated;
