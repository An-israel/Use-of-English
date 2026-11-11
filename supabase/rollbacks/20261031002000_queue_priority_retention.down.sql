drop function if exists public.prune_housekeeping();
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
drop index if exists public.jobs_ready_idx;
alter table public.jobs drop column if exists priority;
create index jobs_ready_idx on public.jobs (queue, run_at) where status = 'queued';
