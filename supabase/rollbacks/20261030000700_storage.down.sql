-- Reverses 0700. Run in reverse order of migrations. Objects in buckets must be removed first.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname ~ '^(covers|published|submissions|finance):' loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
delete from storage.buckets where id in ('covers', 'published', 'submissions', 'finance');
drop function if exists public.try_uuid(text);
