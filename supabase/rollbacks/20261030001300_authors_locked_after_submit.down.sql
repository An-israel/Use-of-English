drop policy if exists "submissions: author deletes draft" on public.submissions;
drop policy if exists "submission_authors: author edits draft" on public.submission_authors;
drop policy if exists "submission_authors: author reads own" on public.submission_authors;
create policy "submission_authors: author manages own draft" on public.submission_authors for all to authenticated
  using (exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = submission_id and s.author_id = auth.uid() and s.status = 'draft'));
