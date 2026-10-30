-- JHTS · 1600 · Admin support: saved filters, atomic reordering, and Articles
-- in Press that are already assigned to a forthcoming issue.
-- Reversal: supabase/rollbacks/20261030001600_admin.down.sql

-- Saved filters on admin lists, private to each staff member.
create table public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  scope text not null check (scope in ('submissions', 'articles')),
  name text not null check (length(name) between 1 and 80),
  query text not null check (length(query) <= 1000),
  created_at timestamptz not null default now(),
  unique (owner_id, scope, name)
);

alter table public.saved_filters enable row level security;
create policy "saved_filters: own" on public.saved_filters for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Reorder a list in one statement: position in the array becomes sort_order.
create or replace function public.reorder_rows(p_kind text, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'articles' then
    if not public.is_editorial() then raise exception 'Editors only' using errcode = '42501'; end if;
    update public.articles a set sort_order = o.n from unnest(p_ids) with ordinality o(id, n) where a.id = o.id;
  elsif p_kind = 'categories' then
    if not public.is_editorial() then raise exception 'Editors only' using errcode = '42501'; end if;
    update public.categories c set sort_order = o.n from unnest(p_ids) with ordinality o(id, n) where c.id = o.id;
  elsif p_kind = 'board' then
    if not public.is_editorial() then raise exception 'Editors only' using errcode = '42501'; end if;
    update public.editorial_board_members b set sort_order = o.n from unnest(p_ids) with ordinality o(id, n) where b.id = o.id;
  elsif p_kind = 'pages' then
    if not public.is_editorial() then raise exception 'Editors only' using errcode = '42501'; end if;
    update public.pages p set sort_order = o.n from unnest(p_ids) with ordinality o(id, n) where p.id = o.id;
  else
    raise exception 'Unknown list %', p_kind;
  end if;
end;
$$;

revoke execute on function public.reorder_rows(text, uuid[]) from public, anon;
grant execute on function public.reorder_rows(text, uuid[]) to authenticated;

-- An Article in Press may be assigned to the issue it will appear in; it stays
-- online as In Press until that issue is published (publish_issue moves it).
alter table public.articles drop constraint articles_in_press_has_no_issue;

-- Saving a page snapshots the previous text into page_versions, which editors
-- may read but not write directly: the trigger writes on their behalf.
alter function public.snapshot_page_version() security definer;

-- Optimistic locking for articles counts editors' changes only. Counters and
-- the search index (refreshed when authors are saved) never invalidate an
-- open form, so saving the authors and then the full text is not a conflict.
create or replace function public.bump_article_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (to_jsonb(new) - 'view_count' - 'download_count' - 'search_vector' - 'updated_at' - 'version')
     = (to_jsonb(old) - 'view_count' - 'download_count' - 'search_vector' - 'updated_at' - 'version') then
    if (new.view_count, new.download_count) is distinct from (old.view_count, old.download_count) then
      new.updated_at := old.updated_at;
    end if;
    new.version := old.version;
    return new;
  end if;
  new.version := old.version + 1;
  return new;
end;
$$;
