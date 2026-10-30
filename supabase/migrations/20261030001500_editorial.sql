-- JHTS · 1500 · Editorial workflow: issues, publishing, articles from
-- submissions, review notifications and scheduled publishing.
-- Reversal: supabase/rollbacks/20261030001500_editorial.down.sql

-- ---------------------------------------------------------------------------
-- Create the next quarterly issue in one click (months pre-filled)
-- ---------------------------------------------------------------------------

create or replace function public.create_next_issue(p_year int default null)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.volumes;
  n int;
  i public.issues;
  y int;
begin
  if not public.is_editorial() then raise exception 'Editors only' using errcode = '42501'; end if;
  -- Default: the latest volume's year, or this year when there are none yet.
  y := coalesce(p_year, (select max(year) from public.volumes), extract(year from now())::int);
  select * into v from public.volumes where year = y;
  if v.id is null then
    insert into public.volumes (number, year)
    values (coalesce((select max(number) from public.volumes), 0) + 1, y)
    returning * into v;
  end if;
  select coalesce(max(number), 0) + 1 into n from public.issues where volume_id = v.id;
  insert into public.issues (volume_id, number, month)
  values (v.id, n, (array[3, 6, 9, 12])[least(n, 4)])
  returning * into i;
  return i;
end;
$$;

-- ---------------------------------------------------------------------------
-- Publishing. A transaction-scoped advisory lock serialises publication so
-- two editors (or the scheduler) cannot publish the same issue at once (item 38).
-- ---------------------------------------------------------------------------

create or replace function public.publish_issue(p_issue uuid)
returns public.issues
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.issues;
begin
  if not public.is_editorial() and auth.uid() is not null then
    raise exception 'Editors only' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('publish_issue'), hashtext(p_issue::text));
  select * into i from public.issues where id = p_issue and deleted_at is null for update;
  if i.id is null then raise exception 'Issue not found' using errcode = 'P0002'; end if;
  if i.status = 'published' then return i; end if;

  update public.issues set status = 'published', published_at = coalesce(published_at, now()), scheduled_for = null
   where id = i.id returning * into i;

  -- Articles assigned to the issue (including former Articles in Press) go live with it.
  update public.articles
     set status = 'published',
         published_at = coalesce(published_at, i.published_at),
         online_at = coalesce(online_at, i.published_at),
         scheduled_for = null
   where issue_id = i.id and deleted_at is null and status in ('draft', 'scheduled', 'in_press', 'unpublished');

  insert into public.domain_events (type, aggregate_id, payload)
  values ('issue.published', i.id, jsonb_build_object('number', i.number));
  return i;
end;
$$;

create or replace function public.unpublish_issue(p_issue uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_editorial() then raise exception 'Editors only' using errcode = '42501'; end if;
  update public.issues set status = 'unpublished' where id = p_issue;
  update public.articles set status = 'unpublished' where issue_id = p_issue and status = 'published';
  insert into public.domain_events (type, aggregate_id, payload) values ('issue.published', p_issue, '{"unpublished": true}');
end;
$$;

-- Publish one article: into its issue if that is out, otherwise online now as an Article in Press.
create or replace function public.publish_article(p_article uuid)
returns public.articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.articles;
  issue_status public.issue_status;
begin
  if not public.has_role('super_admin', 'editor', 'book_review_editor') and auth.uid() is not null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  select * into a from public.articles where id = p_article and deleted_at is null for update;
  if a.id is null then raise exception 'Article not found' using errcode = 'P0002'; end if;
  -- Book-review editors publish book reviews only.
  if a.type <> 'book_review' and not public.is_editorial() and auth.uid() is not null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if a.pdf_path is null and a.body_html is null then
    raise exception 'Add the PDF or the full text before publishing' using errcode = '23514';
  end if;

  if a.issue_id is null then
    update public.articles set status = 'in_press', online_at = coalesce(online_at, now()), scheduled_for = null
     where id = a.id returning * into a;
  else
    select status into issue_status from public.issues where id = a.issue_id;
    if issue_status = 'published' then
      update public.articles
         set status = 'published', online_at = coalesce(online_at, now()), published_at = coalesce(published_at, now()), scheduled_for = null
       where id = a.id returning * into a;
    else
      -- The issue is not out yet: the article goes online now as an Article
      -- in Press, assigned to the forthcoming issue, and joins it on publication.
      update public.articles set status = 'in_press', online_at = coalesce(online_at, now()), scheduled_for = null
       where id = a.id returning * into a;
    end if;
  end if;

  insert into public.domain_events (type, aggregate_id, payload)
  values (case when a.type = 'book_review' then 'book_review.published' else 'article.published' end, a.id,
          jsonb_build_object('slug', a.slug, 'status', a.status));
  return a;
end;
$$;

-- When an article linked to a submission is published, the submission is too.
create or replace function public.sync_submission_on_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.submission_id is not null and new.status in ('published', 'in_press')
     and old.status is distinct from new.status then
    update public.submissions set status = 'published', article_id = new.id
     where id = new.submission_id and status = 'in_production';
  end if;
  return new;
end;
$$;

create trigger articles_sync_submission after update of status on public.articles
  for each row execute function public.sync_submission_on_publish();

-- Scheduled publishing, run by cron with a lease.
create or replace function public.publish_due()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from public.issues where status = 'scheduled' and scheduled_for <= now() and deleted_at is null loop
    perform public.publish_issue(r.id);
    n := n + 1;
  end loop;
  for r in select id from public.articles where status = 'scheduled' and scheduled_for <= now() and deleted_at is null loop
    perform public.publish_article(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- "Create article from submission": a draft article pre-filled from the
-- accepted manuscript, with its authors in order.
-- ---------------------------------------------------------------------------

create or replace function public.article_from_submission(p_submission uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
  aid uuid;
  base_slug text;
  slug text;
  n int := 1;
begin
  if not public.can_manage_submission(p_submission) then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'Submission not found' using errcode = 'P0002'; end if;
  if s.status not in ('accepted_awaiting_fee', 'in_production', 'published') then
    raise exception 'Only accepted submissions can become articles' using errcode = 'P0001';
  end if;
  if s.article_id is not null then return s.article_id; end if;
  select id into aid from public.articles where submission_id = s.id and deleted_at is null limit 1;
  if aid is not null then
    update public.submissions set article_id = aid where id = s.id;
    return aid;
  end if;

  base_slug := trim(both '-' from regexp_replace(lower(extensions.unaccent(s.title)), '[^a-z0-9]+', '-', 'g'));
  base_slug := left(coalesce(nullif(base_slug, ''), 'article'), 80);
  slug := base_slug;
  while exists (select 1 from public.articles a where a.slug = slug) loop
    n := n + 1;
    slug := base_slug || '-' || n;
  end loop;

  insert into public.articles (type, category_id, title, slug, abstract, keywords, citation_style, received_at, accepted_at, submission_id, status)
  values (s.type, s.category_id, s.title, slug, s.abstract, s.keywords, s.citation_style,
          coalesce(s.received_at, s.submitted_at::date), coalesce(s.accepted_at, current_date), s.id, 'draft')
  returning id into aid;

  insert into public.article_authors (article_id, position, name, affiliation, email, orcid, is_corresponding)
  select aid, position, name, affiliation, email, orcid, is_corresponding
    from public.submission_authors where submission_id = s.id order by position;

  if s.type = 'book_review' then
    insert into public.book_reviews (article_id, book_title, book_author) values (aid, '[Book title]', '[Book author]');
  end if;
  update public.submissions set article_id = aid where id = s.id;
  return aid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Review notifications become domain events (emails go through the queue).
-- ---------------------------------------------------------------------------

create or replace function public.review_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.domain_events (type, aggregate_id, payload)
    values ('review.assigned', new.id, jsonb_build_object('submission_id', new.submission_id));
  elsif new.status = 'submitted' and old.status <> 'submitted' then
    insert into public.domain_events (type, aggregate_id, payload)
    values ('review.submitted', new.id, jsonb_build_object('submission_id', new.submission_id, 'recommendation', new.recommendation));
  end if;
  return new;
end;
$$;

create trigger review_assignments_events after insert or update of status on public.review_assignments
  for each row execute function public.review_events();

-- Reviewer comments the editor shares with the author become a visible file;
-- a reviewer reads only their own assignment's details through this view.
create or replace view public.reviewer_assignment_detail
with (security_invoker = false)
as
select ra.id as assignment_id, ra.status, ra.round, ra.due_at, ra.recommendation, ra.comments_to_author,
       ra.comments_to_editor, ra.submitted_at, ra.version,
       s.id as submission_id, s.title, s.abstract, s.keywords, s.type, c.name as category
from public.review_assignments ra
join public.submissions s on s.id = ra.submission_id
left join public.categories c on c.id = s.category_id
where ra.reviewer_id = auth.uid();

revoke all on public.reviewer_assignment_detail from anon;
grant select on public.reviewer_assignment_detail to authenticated;

revoke execute on function public.publish_due() from public, anon, authenticated;
grant execute on function public.publish_due() to service_role;
revoke execute on function public.create_next_issue(int), public.publish_issue(uuid), public.unpublish_issue(uuid),
  public.publish_article(uuid), public.article_from_submission(uuid) from public, anon;
grant execute on function public.create_next_issue(int), public.publish_issue(uuid), public.unpublish_issue(uuid),
  public.publish_article(uuid), public.article_from_submission(uuid) to authenticated;
