-- JHTS · 0500 · Operations: domain events, job queue, dead letters, audit log,
-- metrics (partitioned), rate limiting, cron leases, contact inbox, file versions.
-- Reversal: supabase/rollbacks/20261030000500_operations.down.sql

-- ---------------------------------------------------------------------------
-- Domain events (item 17) → jobs (item 15)
-- ---------------------------------------------------------------------------

create table public.domain_events (
  id bigint generated always as identity primary key,
  type text not null check (type in (
    'submission.created', 'submission.status_changed', 'submission.revised',
    'payment.succeeded', 'payment.failed', 'payment.waived',
    'review.assigned', 'review.submitted',
    'article.published', 'article.unpublished', 'issue.published',
    'book_review.published', 'page.updated', 'contact.received'
  )),
  aggregate_id uuid,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index domain_events_type_idx on public.domain_events (type, created_at desc);
create index domain_events_aggregate_idx on public.domain_events (aggregate_id);

create table public.jobs (
  id bigint generated always as identity primary key,
  queue text not null default 'default',
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  -- jobs with the same key are created once (idempotent producers)
  dedupe_key text unique,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts int not null default 0,
  max_attempts int not null default 6,
  run_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index jobs_ready_idx on public.jobs (queue, run_at) where status = 'queued';
create index jobs_running_idx on public.jobs (locked_at) where status = 'running';

create table public.dead_letter_jobs (
  id bigint primary key,
  queue text not null,
  kind text not null,
  payload jsonb not null,
  attempts int not null,
  last_error text,
  failed_at timestamptz not null default now(),
  original_created_at timestamptz not null
);

-- Every domain event fans out through one dispatch job.
create or replace function public.enqueue_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.jobs (kind, payload, dedupe_key)
  values ('dispatch_event', jsonb_build_object('event_id', new.id, 'type', new.type), 'event:' || new.id)
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

create trigger domain_events_enqueue after insert on public.domain_events
  for each row execute function public.enqueue_domain_event();

-- Claim a batch of jobs (items 37 and 44): FOR UPDATE SKIP LOCKED means
-- concurrent workers never take the same job and never block each other.
-- Jobs stuck "running" for more than 10 minutes are reclaimed.
create or replace function public.claim_jobs(p_worker text, p_limit int default 10, p_queue text default 'default')
returns setof public.jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with ready as (
    select j.id from public.jobs j
    where j.queue = p_queue
      and ((j.status = 'queued' and j.run_at <= now())
           or (j.status = 'running' and j.locked_at < now() - interval '10 minutes'))
    order by j.run_at, j.id
    limit least(greatest(p_limit, 1), 50)
    for update skip locked
  )
  update public.jobs j
     set status = 'running', locked_at = now(), locked_by = p_worker, attempts = j.attempts + 1
    from ready
   where j.id = ready.id
  returning j.*;
end;
$$;

create or replace function public.complete_job(p_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.jobs set status = 'done', finished_at = now(), locked_at = null, locked_by = null where id = p_id
$$;

-- Retry with exponential backoff and full jitter (items 12–13); after
-- max_attempts the job moves to the dead-letter table (item 20).
create or replace function public.fail_job(p_id bigint, p_error text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  j public.jobs;
  delay_seconds numeric;
begin
  select * into j from public.jobs where id = p_id for update;
  if j.id is null then
    return 'missing';
  end if;
  if j.attempts >= j.max_attempts then
    insert into public.dead_letter_jobs (id, queue, kind, payload, attempts, last_error, original_created_at)
    values (j.id, j.queue, j.kind, j.payload, j.attempts, left(p_error, 4000), j.created_at)
    on conflict (id) do update set attempts = excluded.attempts, last_error = excluded.last_error, failed_at = now();
    delete from public.jobs where id = p_id;
    return 'dead';
  end if;
  delay_seconds := random() * least(3600, 15 * power(2, j.attempts));
  update public.jobs
     set status = 'queued', run_at = now() + make_interval(secs => delay_seconds),
         locked_at = null, locked_by = null, last_error = left(p_error, 4000)
   where id = p_id;
  return 'retry';
end;
$$;

create or replace function public.retry_dead_letter(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.dead_letter_jobs;
begin
  if not public.has_role('super_admin') then
    raise exception 'Super Admin only' using errcode = '42501';
  end if;
  select * into d from public.dead_letter_jobs where id = p_id for update;
  if d.id is null then return; end if;
  insert into public.jobs (queue, kind, payload) values (d.queue, d.kind, d.payload);
  delete from public.dead_letter_jobs where id = p_id;
end;
$$;

-- Status changes and new paid submissions become domain events.
create trigger submissions_status_history after update of status on public.submissions
  for each row execute function public.record_submission_status();

-- ---------------------------------------------------------------------------
-- Audit log (Super Admin only)
-- ---------------------------------------------------------------------------

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  table_name text not null,
  row_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_row_idx on public.audit_log (table_name, row_id);
create index audit_log_actor_idx on public.audit_log (actor_id, created_at desc);

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_j jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_j jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  diff jsonb;
  noisy text[] := array['updated_at', 'version', 'search_vector', 'body_html', 'raw', 'view_count', 'download_count'];
begin
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_object('from', old_j -> k, 'to', new_j -> k))
      into diff
      from jsonb_object_keys(new_j) k
     where k <> all (noisy) and (old_j -> k) is distinct from (new_j -> k);
    if diff is null then
      return new; -- nothing meaningful changed (e.g. a counter)
    end if;
  else
    diff := coalesce(new_j, old_j) - noisy;
  end if;

  insert into public.audit_log (actor_id, actor_email, action, table_name, row_id, changes)
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(new_j ->> 'id', old_j ->> 'id', new_j ->> 'key', old_j ->> 'key', new_j ->> 'article_id'),
    diff
  );
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'volumes', 'issues', 'categories', 'articles', 'book_reviews',
    'editorial_board_members', 'pages', 'call_for_papers', 'site_settings', 'feature_flags',
    'submissions', 'review_assignments', 'payments', 'refunds'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
      t || '_audit', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Metrics: views and downloads (section 10), partitioned monthly (item 31)
-- ---------------------------------------------------------------------------

create table public.metrics_events (
  id bigint generated always as identity,
  day date not null default current_date,
  kind text not null check (kind in ('view', 'download')),
  article_id uuid,
  issue_id uuid,
  format text not null default '' check (format in ('', 'pdf', 'docx', 'html')),
  -- article id, or "issue:<id>" for full-issue downloads; used for de-duplication
  target_key text not null,
  -- salted daily hash; no IP addresses or personal data are stored
  session_hash text not null,
  country text,
  created_at timestamptz not null default now(),
  primary key (id, day)
) partition by range (day);

-- one count per session per article per kind/format per day (item 14)
alter table public.metrics_events
  add constraint metrics_events_dedupe unique (day, kind, target_key, format, session_hash);
create index metrics_events_article_idx on public.metrics_events (article_id, created_at);

create or replace function public.ensure_metrics_partition(p_month date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  start_d date := date_trunc('month', p_month)::date;
  end_d date := (date_trunc('month', p_month) + interval '1 month')::date;
  part text := format('metrics_events_%s', to_char(start_d, 'YYYY_MM'));
begin
  if to_regclass('public.' || part) is null then
    execute format(
      'create table public.%I partition of public.metrics_events for values from (%L) to (%L)',
      part, start_d, end_d
    );
  end if;
end;
$$;

-- current month plus the next two; a monthly cron keeps this rolling
select public.ensure_metrics_partition(current_date);
select public.ensure_metrics_partition((current_date + interval '1 month')::date);
select public.ensure_metrics_partition((current_date + interval '2 months')::date);
create table public.metrics_events_default partition of public.metrics_events default;

-- Daily rollup keeps dashboards fast and lets raw events be pruned (item 88).
create table public.metrics_daily (
  day date not null,
  article_id uuid not null references public.articles (id) on delete cascade,
  views int not null default 0,
  downloads_pdf int not null default 0,
  downloads_docx int not null default 0,
  primary key (day, article_id)
);

create or replace function public.record_metric(
  p_kind text, p_article uuid, p_issue uuid, p_format text, p_session_hash text, p_country text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted int;
begin
  insert into public.metrics_events (kind, article_id, issue_id, format, target_key, session_hash, country)
  values (p_kind, p_article, p_issue, coalesce(p_format, ''),
          coalesce(p_article::text, 'issue:' || p_issue::text), p_session_hash, p_country)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted > 0 and p_article is not null then
    perform public.increment_article_counter(p_article, p_kind);
  end if;
  return inserted > 0;
end;
$$;

create or replace function public.rollup_metrics(p_day date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.metrics_daily (day, article_id, views, downloads_pdf, downloads_docx)
  select day, article_id,
         count(*) filter (where kind = 'view'),
         count(*) filter (where kind = 'download' and format = 'pdf'),
         count(*) filter (where kind = 'download' and format = 'docx')
    from public.metrics_events
   where day = p_day and article_id is not null
     and exists (select 1 from public.articles a where a.id = article_id)
   group by day, article_id
  on conflict (day, article_id) do update
     set views = excluded.views, downloads_pdf = excluded.downloads_pdf, downloads_docx = excluded.downloads_docx
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting (item 1): Postgres-backed fixed window
-- ---------------------------------------------------------------------------

create unlogged table public.rate_limit_buckets (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);

create or replace function public.rate_limit_hit(p_key text, p_window_seconds int, p_max int)
returns table (allowed boolean, remaining int, retry_after int)
language plpgsql
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n int;
begin
  insert into public.rate_limit_buckets (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = public.rate_limit_buckets.hits + 1
  returning hits into n;
  allowed := n <= p_max;
  remaining := greatest(p_max - n, 0);
  retry_after := case when n <= p_max then 0
                      else ceil(extract(epoch from (w + make_interval(secs => p_window_seconds) - now())))::int end;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cron leases (items 33 and 38): only one instance runs a given cron job.
-- ---------------------------------------------------------------------------

create table public.cron_leases (
  name text primary key,
  holder text not null,
  expires_at timestamptz not null,
  last_started_at timestamptz,
  last_finished_at timestamptz,
  last_status text,
  last_error text
);

create or replace function public.acquire_lease(p_name text, p_holder text, p_ttl_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  got text;
begin
  insert into public.cron_leases (name, holder, expires_at, last_started_at)
  values (p_name, p_holder, now() + make_interval(secs => p_ttl_seconds), now())
  on conflict (name) do update
     set holder = excluded.holder, expires_at = excluded.expires_at, last_started_at = now()
   where public.cron_leases.expires_at < now()
  returning holder into got;
  return got = p_holder;
end;
$$;

create or replace function public.release_lease(p_name text, p_holder text, p_status text, p_error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.cron_leases
     set expires_at = now(), last_finished_at = now(), last_status = p_status, last_error = p_error
   where name = p_name and holder = p_holder
$$;

-- ---------------------------------------------------------------------------
-- Contact inbox
-- ---------------------------------------------------------------------------

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  email extensions.citext not null,
  subject text not null check (length(subject) between 1 and 300),
  message text not null check (length(message) between 1 and 8000),
  is_read boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index contact_messages_inbox_idx on public.contact_messages (created_at desc) where archived_at is null;

create or replace function public.contact_received_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.domain_events (type, aggregate_id, payload)
  values ('contact.received', new.id, jsonb_build_object('subject', new.subject));
  return new;
end;
$$;

create trigger contact_messages_event after insert on public.contact_messages
  for each row execute function public.contact_received_event();

-- ---------------------------------------------------------------------------
-- File versions: replaced published files are kept (section 9.3, item 55)
-- ---------------------------------------------------------------------------

create table public.file_versions (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('article', 'issue', 'book_review')),
  entity_id uuid not null,
  slot text not null check (slot in ('pdf', 'docx', 'cover', 'full_pdf', 'full_docx', 'book_cover')),
  storage_path text not null,
  replaced_by uuid references public.profiles (id),
  replaced_at timestamptz not null default now()
);

create index file_versions_entity_idx on public.file_versions (entity, entity_id, slot, replaced_at desc);

-- Uploads that never got linked to a row (saga compensation, item 19)
create table public.pending_uploads (
  storage_path text primary key,
  bucket text not null,
  owner_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Health and schema version
-- ---------------------------------------------------------------------------

create or replace function public.health_check()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'db_time', now(),
    'queue_depth', (select count(*) from public.jobs where status = 'queued'),
    'dead_letters', (select count(*) from public.dead_letter_jobs)
  )
$$;

create or replace function public.schema_version()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return (select max(version) from supabase_migrations.schema_migrations);
exception when undefined_table or invalid_schema_name then
  return null;
end;
$$;
