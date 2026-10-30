-- Reverses 0700. Run in reverse order of migrations. Buckets that still hold
-- files are kept (remove the files through the Storage API first); empty ones
-- are deleted. Re-applying 0700 updates kept buckets in place.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname ~ '^(covers|published|submissions|finance):' loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
set local storage.allow_delete_query = 'true';
delete from storage.buckets b
 where b.id in ('covers', 'published', 'submissions', 'finance')
   and not exists (select 1 from storage.objects o where o.bucket_id = b.id);
drop function if exists public.try_uuid(text);
