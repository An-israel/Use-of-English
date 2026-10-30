-- JHTS · 0900 · Reviewers are scholars too: they may submit their own work.
-- (Finance Officers still may not, per the roles table in section 6.)
-- Reversal: supabase/rollbacks/20261030000900_reviewers_can_submit.down.sql

drop policy "submissions: author creates draft" on public.submissions;
create policy "submissions: author creates draft" on public.submissions for insert to authenticated
  with check (
    author_id = auth.uid() and status = 'draft'
    and public.has_role('author', 'reviewer', 'editor', 'super_admin', 'book_review_editor')
  );
