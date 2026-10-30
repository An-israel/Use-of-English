-- Restore the 0200 version-bump rule (counters only).
create or replace function public.bump_article_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.view_count, new.download_count) is distinct from (old.view_count, old.download_count)
     and (to_jsonb(new) - 'view_count' - 'download_count' - 'updated_at' - 'version')
       = (to_jsonb(old) - 'view_count' - 'download_count' - 'updated_at' - 'version') then
    new.updated_at := old.updated_at;
    return new;
  end if;
  new.version := old.version + 1;
  return new;
end;
$$;
alter function public.snapshot_page_version() security invoker;
drop function if exists public.reorder_rows(text, uuid[]);
drop table if exists public.saved_filters;
-- Articles in Press assigned to an issue must be detached before the old rule returns.
update public.articles set issue_id = null where status = 'in_press' and issue_id is not null;
alter table public.articles add constraint articles_in_press_has_no_issue check (status <> 'in_press' or issue_id is null);
