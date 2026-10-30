drop policy "submissions: author creates draft" on public.submissions;
create policy "submissions: author creates draft" on public.submissions for insert to authenticated
  with check (author_id = auth.uid() and status = 'draft' and public.has_role('author', 'editor', 'super_admin', 'book_review_editor'));
