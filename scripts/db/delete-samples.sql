-- Removes every SAMPLE volume, issue and article before launch (brief 14.2).
-- Run through npm run samples:delete, which first removes these items' files from Storage.
begin;
delete from public.articles where is_sample;           -- cascades to authors and book_reviews
delete from public.issues where is_sample;
delete from public.volumes v where is_sample and not exists (select 1 from public.issues i where i.volume_id = v.id);
commit;
