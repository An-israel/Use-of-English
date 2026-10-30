-- JHTS · 1300 · Co-author lists are editable by the author only while the
-- submission is a draft (the earlier policy checked draft status only on write,
-- so a delete after submission was still possible).
-- Reversal: supabase/rollbacks/20261030001300_authors_locked_after_submit.down.sql

drop policy "submission_authors: author manages own draft" on public.submission_authors;

create policy "submission_authors: author reads own" on public.submission_authors for select to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid()));

create policy "submission_authors: author edits draft" on public.submission_authors for all to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid() and s.status = 'draft'))
  with check (exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid() and s.status = 'draft'));

-- Authors may delete their own unsent drafts (files are removed by the server).
create policy "submissions: author deletes draft" on public.submissions for delete to authenticated
  using (author_id = auth.uid() and status = 'draft');
