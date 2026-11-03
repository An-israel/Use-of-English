-- B4: payment work jumps the queue. A receipt used to wait behind any backlog
-- of emails; now jobs carry a priority and payment events are claimed first.
alter table public.jobs add column if not exists priority smallint not null default 0;
drop index if exists public.jobs_ready_idx;
create index jobs_ready_idx on public.jobs (queue, priority desc, run_at) where status = 'queued';

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
    order by j.priority desc, j.run_at, j.id
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

create or replace function public.enqueue_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.jobs (kind, payload, dedupe_key, priority)
  values ('dispatch_event', jsonb_build_object('event_id', new.id, 'type', new.type), 'event:' || new.id,
          case when new.type like 'payment.%' then 10 else 0 end)
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

-- B7: housekeeping rows are kept for a fixed time, then removed by the daily
-- maintenance run. Payments, receipts, submissions, reviews, the audit log and
-- dead-letter jobs are never touched here.
create or replace function public.prune_housekeeping()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_jobs int; n_buckets int; n_events int; n_notes int; n_emails int;
begin
  delete from public.jobs where status = 'done' and finished_at < now() - interval '30 days';
  get diagnostics n_jobs = row_count;
  delete from public.rate_limit_buckets where window_start < now() - interval '1 day';
  get diagnostics n_buckets = row_count;
  -- Events are fanned out into jobs at once; keep a year for troubleshooting.
  delete from public.domain_events e where e.created_at < now() - interval '365 days'
    and not exists (select 1 from public.jobs j where j.dedupe_key = 'event:' || e.id and j.status <> 'done');
  get diagnostics n_events = row_count;
  delete from public.staff_notifications where created_at < now() - interval '180 days';
  get diagnostics n_notes = row_count;
  -- Delivered or logged emails after a year; failed ones stay for follow-up.
  delete from public.email_outbox where status in ('sent', 'logged') and created_at < now() - interval '365 days';
  get diagnostics n_emails = row_count;
  return jsonb_build_object('jobs', n_jobs, 'rateLimits', n_buckets, 'events', n_events,
                            'notifications', n_notes, 'emails', n_emails);
end;
$$;

revoke execute on function public.prune_housekeeping() from public, anon, authenticated;
grant execute on function public.prune_housekeeping() to service_role;
