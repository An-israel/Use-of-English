-- JHTS · 1200 · Submit a draft. Runs as the author (auth.uid()) so history
-- records who submitted; completeness is checked in the database as well as
-- in the form.
-- Reversal: supabase/rollbacks/20261030001200_submit_submission.down.sql

-- Fees are charged only when both the "fees" setting and the fees_enabled flag are on.
create or replace function public.fees_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (value ->> 'enabled')::boolean from public.site_settings where key = 'fees'), true)
     and coalesce((select enabled from public.feature_flags where key = 'fees_enabled'), true)
$$;

create or replace function public.submit_submission(p_submission uuid)
returns public.submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
  words int;
  -- Read from settings, never from the caller: authors cannot opt out of fees.
  fees_on boolean := public.fees_enabled();
begin
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null or s.author_id <> auth.uid() then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if s.status <> 'draft' then
    return s; -- already submitted: idempotent for double clicks and retries
  end if;

  words := coalesce(array_length(regexp_split_to_array(trim(s.abstract), '\s+'), 1), 0);
  if length(trim(s.title)) < 5 then raise exception 'Add a title' using errcode = '23514'; end if;
  if s.category_id is null then raise exception 'Choose a subject area' using errcode = '23514'; end if;
  if s.citation_style is null then raise exception 'Choose a citation style' using errcode = '23514'; end if;
  if words < 150 or words > 250 then raise exception 'The abstract must be 150 to 250 words' using errcode = '23514'; end if;
  if coalesce(array_length(s.keywords, 1), 0) not between 3 and 6 then raise exception 'Add 3 to 6 keywords' using errcode = '23514'; end if;
  if not exists (select 1 from public.submission_authors where submission_id = s.id and is_corresponding) then
    raise exception 'Choose a corresponding author' using errcode = '23514';
  end if;
  if not exists (select 1 from public.submission_files where submission_id = s.id and kind = 'manuscript')
     or not exists (select 1 from public.submission_files where submission_id = s.id and kind = 'title_page') then
    raise exception 'Upload the anonymised manuscript and the title page' using errcode = '23514';
  end if;
  if coalesce((s.declarations ->> 'all')::boolean, false) is not true then
    raise exception 'Confirm all the declarations' using errcode = '23514';
  end if;

  update public.submissions
     set public_id = public.next_submission_public_id(),
         status = case when fees_on then 'awaiting_review_fee'::public.submission_status else 'submitted'::public.submission_status end,
         submitted_at = case when fees_on then null else now() end,
         received_at = case when fees_on then null else current_date end
   where id = s.id
  returning * into s;
  return s;
end;
$$;

revoke execute on function public.submit_submission(uuid) from public, anon;
grant execute on function public.submit_submission(uuid) to authenticated;
