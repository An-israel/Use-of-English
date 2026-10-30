-- JHTS · 0800 · Public search (section 5.8)
-- Weighted full-text search (A title, B keywords and authors, C abstract) with
-- highlighted snippets, filters, and pg_trgm typo tolerance when the
-- full-text query finds nothing.
-- Reversal: supabase/rollbacks/20261030000800_search.down.sql

create or replace function public.search_articles(
  p_query text,
  p_year int default null,
  p_volume int default null,
  p_issue int default null,
  p_category text default null,
  p_type public.article_type default null,
  p_author text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  slug text,
  rank real,
  title_html text,
  snippet_html text,
  total bigint
)
language plpgsql
stable
set search_path = ''
as $$
declare
  q tsquery := case when coalesce(trim(p_query), '') = '' then null
                    else websearch_to_tsquery('english', extensions.unaccent(p_query)) end;
  fuzzy boolean := false;
  opts text := 'StartSel=<mark>, StopSel=</mark>, MaxFragments=2, MaxWords=28, MinWords=12, FragmentDelimiter=" … "';
begin
  -- No full-text hit at all: fall back to trigram similarity on titles and authors.
  if q is not null and not exists (
    select 1 from public.articles a
    where a.deleted_at is null and a.status in ('published', 'in_press') and a.search_vector @@ q
  ) then
    fuzzy := true;
  end if;

  return query
  with filtered as (
    select a.*
    from public.articles a
    left join public.issues i on i.id = a.issue_id
    left join public.volumes v on v.id = i.volume_id
    left join public.categories c on c.id = a.category_id
    where a.deleted_at is null
      and a.status in ('published', 'in_press')
      and (p_year is null or coalesce(v.year, extract(year from a.online_at)::int) = p_year)
      and (p_volume is null or v.number = p_volume)
      and (p_issue is null or i.number = p_issue)
      and (p_category is null or c.slug = p_category)
      and (p_type is null or a.type = p_type)
      and (p_author is null or exists (
        select 1 from public.article_authors aa
        where aa.article_id = a.id and aa.name ilike '%' || p_author || '%'
      ))
  ),
  scored as (
    select f.*,
      case
        when q is null then 0::real
        when not fuzzy then ts_rank_cd(f.search_vector, q, 32)
        else greatest(
          extensions.word_similarity(p_query, f.title),
          coalesce((select max(extensions.word_similarity(p_query, aa.name))
                    from public.article_authors aa where aa.article_id = f.id), 0)
        )
      end as r
    from filtered f
    where q is null
       or (not fuzzy and f.search_vector @@ q)
       or (fuzzy and (
            extensions.word_similarity(p_query, f.title) > 0.35
            or exists (select 1 from public.article_authors aa
                       where aa.article_id = f.id and extensions.word_similarity(p_query, aa.name) > 0.4)
          ))
  )
  select s.id, s.slug, s.r,
    case when q is null or fuzzy then s.title else ts_headline('english', s.title, q, 'HighlightAll=true, StartSel=<mark>, StopSel=</mark>') end,
    case when q is null or fuzzy then left(s.abstract, 260) else ts_headline('english', s.abstract, q, opts) end,
    count(*) over ()
  from scored s
  order by s.r desc, coalesce(s.published_at, s.online_at) desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.search_articles(text, int, int, int, text, public.article_type, text, int, int) to anon, authenticated;
