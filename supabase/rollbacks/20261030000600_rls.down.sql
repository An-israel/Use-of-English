-- Reverses 0600: drops every policy on public tables and disables RLS.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
  for p in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I disable row level security', p.tablename);
  end loop;
end $$;
drop function if exists public.article_author_emails(uuid);
grant select on public.article_authors to anon, authenticated;
