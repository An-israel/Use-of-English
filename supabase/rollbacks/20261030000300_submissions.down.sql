drop view if exists public.reviewer_submissions;
alter table public.articles drop constraint if exists articles_submission_fk;
drop table if exists public.review_assignments, public.submission_events, public.submission_files,
  public.submission_authors, public.submissions, public.submission_counters cascade;
drop function if exists public.withdraw_submission(uuid, text), public.can_manage_submission(uuid),
  public.is_assigned_reviewer(uuid), public.guard_review_update(), public.record_submission_status(),
  public.next_submission_public_id();
