-- JHTS · 0700 · Storage buckets and policies (section 9.1)
-- Reversal: supabase/rollbacks/20261030000700_storage.down.sql
--
-- Path conventions
--   covers/      issues/<issue_id>/<file>, books/<article_id>/<file>, board/<member_id>/<file>
--   published/   articles/<article_id>/v<n>-<file>, issues/<issue_id>/v<n>-<file>
--   submissions/ <submission_id>/<kind>/v<n>-<file>   (no author identity in the path)
--   finance/     receipts/<author_id>/<receipt_number>.pdf, letters/<author_id>/<file>.pdf

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('covers', 'covers', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('published', 'published', true, 50 * 1024 * 1024, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('submissions', 'submissions', false, 20 * 1024 * 1024, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('finance', 'finance', false, 5 * 1024 * 1024, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

-- covers and published: anyone reads; editors (and book-review editors for book material) write
create policy "covers: public read" on storage.objects for select
  using (bucket_id = 'covers');
create policy "covers: editors write" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.has_role('super_admin', 'editor', 'book_review_editor'));
create policy "covers: editors update" on storage.objects for update to authenticated
  using (bucket_id = 'covers' and public.has_role('super_admin', 'editor', 'book_review_editor'));
create policy "covers: editors delete" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and public.has_role('super_admin', 'editor', 'book_review_editor'));

create policy "published: public read" on storage.objects for select
  using (bucket_id = 'published');
create policy "published: editors write" on storage.objects for insert to authenticated
  with check (bucket_id = 'published' and public.has_role('super_admin', 'editor', 'book_review_editor'));
create policy "published: editors update" on storage.objects for update to authenticated
  using (bucket_id = 'published' and public.has_role('super_admin', 'editor', 'book_review_editor'));
-- published files are never deleted from the browser: previous versions are kept

-- submissions: the author, the people managing the submission, and assigned reviewers
create policy "submissions: author uploads" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] in ('manuscript', 'title_page', 'cover_letter', 'revision')
    and exists (
      select 1 from public.submissions s
      where s.id = public.try_uuid((storage.foldername(name))[1])
        and s.author_id = auth.uid()
        and (s.status = 'draft' or (s.status = 'revisions_requested' and (storage.foldername(name))[2] = 'revision'))
    )
  );

create policy "submissions: author reads own" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and exists (
      select 1 from public.submission_files f
      join public.submissions s on s.id = f.submission_id
      where f.storage_path = name and f.visible_to_author and s.author_id = auth.uid()
    )
  );

create policy "submissions: managers read" on storage.objects for select to authenticated
  using (bucket_id = 'submissions'
         and public.can_manage_submission(public.try_uuid((storage.foldername(name))[1])));

create policy "submissions: managers upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions'
              and public.can_manage_submission(public.try_uuid((storage.foldername(name))[1])));

create policy "submissions: reviewers read manuscript" on storage.objects for select to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] in ('manuscript', 'revision')
    and public.is_assigned_reviewer(public.try_uuid((storage.foldername(name))[1]))
  );

create policy "submissions: reviewers upload report" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[2] = 'review_report'
    and exists (
      select 1 from public.review_assignments ra
      where ra.submission_id = public.try_uuid((storage.foldername(name))[1])
        and ra.reviewer_id = auth.uid() and ra.status = 'accepted'
    )
  );

-- finance: receipts and acceptance letters
create policy "finance: staff read" on storage.objects for select to authenticated
  using (bucket_id = 'finance' and public.has_role('super_admin', 'finance_officer'));
create policy "finance: author reads own" on storage.objects for select to authenticated
  using (bucket_id = 'finance' and (storage.foldername(name))[2] = auth.uid()::text);
