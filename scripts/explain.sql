-- Item 26: query plans for the hottest reads. Run with
--   psql "$DATABASE_URL" -f scripts/explain.sql
-- Plans differ with data volume; re-run after the first year of content.
\echo '== Archive: published issues with volumes'
explain (analyze, buffers, costs off, summary on)
select i.id, i.number, i.month, i.title, v.number, v.year from public.issues i
join public.volumes v on v.id = i.volume_id
where i.status = 'published' and i.deleted_at is null order by i.published_at desc;

\echo '== Issue page: an issue''s articles with authors and categories (one nested select)'
explain (analyze, buffers, costs off, summary on)
select a.id, a.slug, a.title, a.type, a.first_page, c.slug,
       (select json_agg(json_build_object('name', aa.name) order by aa.position) from public.article_authors aa where aa.article_id = a.id)
from public.articles a left join public.categories c on c.id = a.category_id
where a.issue_id = (select id from public.issues where status = 'published' order by published_at limit 1)
  and a.deleted_at is null and a.status in ('published', 'in_press')
order by a.sort_order;

\echo '== Article page by slug'
explain (analyze, buffers, costs off, summary on)
select * from public.articles where slug = 'code-switching-and-authority-in-nsukka-classrooms' and deleted_at is null;

\echo '== Search (weighted full text, GIN index)'
explain (analyze, buffers, costs off, summary on)
select * from public.search_articles('language');

\echo '== Dashboard: views and downloads for 90 days'
explain (analyze, buffers, costs off, summary on)
select day, sum(views), sum(downloads_pdf + downloads_docx) from public.metrics_daily
where day >= current_date - 89 group by day order by day;

\echo '== Dashboard: submissions by status'
explain (analyze, buffers, costs off, summary on)
select status, count(*) from public.submissions where status <> 'draft' group by status;

\echo '== Finance: the ledger for one month'
set role postgres;
explain (analyze, buffers, costs off, summary on)
select * from public.payment_ledger where activity_at >= now() - interval '31 days' order by activity_at desc;
