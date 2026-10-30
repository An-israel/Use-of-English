-- JHTS · 1400 · Authors send a revised manuscript when revisions are requested.
-- Reversal: supabase/rollbacks/20261030001400_submit_revision.down.sql

create or replace function public.submit_revision(p_submission uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
  requested_at timestamptz;
begin
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null or s.author_id <> auth.uid() then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if s.status <> 'revisions_requested' then
    raise exception 'Revisions are not being requested' using errcode = 'P0001';
  end if;
  select max(created_at) into requested_at from public.submission_events
   where submission_id = s.id and to_status = 'revisions_requested';
  if not exists (select 1 from public.submission_files
                 where submission_id = s.id and kind = 'revision' and created_at >= coalesce(requested_at, '-infinity')) then
    raise exception 'Upload the revised manuscript first' using errcode = '23514';
  end if;
  update public.submissions set status = 'revised_received' where id = s.id;
  if coalesce(trim(p_note), '') <> '' then
    insert into public.submission_events (submission_id, actor_id, message, visibility)
    values (s.id, auth.uid(), left(trim(p_note), 4000), 'author');
  end if;
  insert into public.domain_events (type, aggregate_id, payload)
  values ('submission.revised', s.id, jsonb_build_object('public_id', s.public_id));
end;
$$;

revoke execute on function public.submit_revision(uuid, text) from public, anon;
grant execute on function public.submit_revision(uuid, text) to authenticated;
