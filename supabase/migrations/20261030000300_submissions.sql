-- JHTS · 0300 · Submissions, files, status history and in-site peer review
-- Reversal: supabase/rollbacks/20261030000300_submissions.down.sql

-- Per-year counter for public IDs such as JHTS-2027-0042 (atomic, item 39).
create table public.submission_counters (
  year int primary key,
  last_value int not null default 0
);

create or replace function public.next_submission_public_id()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  insert into public.submission_counters (year, last_value) values (y, 1)
  on conflict (year) do update set last_value = public.submission_counters.last_value + 1
  returning last_value into n;
  return format('JHTS-%s-%s', y, lpad(n::text, 4, '0'));
end;
$$;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  -- assigned when the draft is first submitted, not while drafting
  public_id text unique,
  author_id uuid not null references public.profiles (id) on delete restrict,
  type public.article_type not null check (type <> 'editorial'),
  category_id uuid references public.categories (id) on delete restrict,
  title text not null default '',
  abstract text not null default '',
  keywords text[] not null default '{}',
  citation_style public.citation_style,
  status public.submission_status not null default 'draft',
  similarity_percent numeric(5, 2) check (similarity_percent between 0 and 100),
  rejection_reason text,
  declarations jsonb not null default '{}'::jsonb,
  -- client-generated key so a double-click or retry never duplicates (item 14)
  idempotency_key uuid unique,
  handling_editor_id uuid references public.profiles (id),
  received_at date,
  accepted_at date,
  decided_at timestamptz,
  submitted_at timestamptz,
  article_id uuid references public.articles (id) on delete set null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_author_idx on public.submissions (author_id, created_at desc);
create index submissions_status_idx on public.submissions (status, updated_at desc);
create index submissions_category_idx on public.submissions (category_id);
create index submissions_editor_idx on public.submissions (handling_editor_id);
create index submissions_article_idx on public.submissions (article_id);

alter table public.articles
  add constraint articles_submission_fk foreign key (submission_id)
  references public.submissions (id) on delete set null;
create index articles_submission_idx on public.articles (submission_id);

create trigger submissions_touch before update on public.submissions
  for each row execute function public.touch_updated_at();
create trigger submissions_version before update on public.submissions
  for each row execute function public.bump_version();

create table public.submission_authors (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  position int not null,
  name text not null,
  affiliation text,
  email extensions.citext not null,
  orcid text check (orcid is null or orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
  is_corresponding boolean not null default false,
  unique (submission_id, position) deferrable initially deferred
);

create index submission_authors_submission_idx on public.submission_authors (submission_id, position);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  kind text not null check (kind in (
    'manuscript', 'title_page', 'cover_letter', 'revision',
    'plagiarism_report', 'reviewer_comments', 'review_report'
  )),
  version int not null default 1,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 20 * 1024 * 1024),
  -- private files are never shown to the author (plagiarism report, raw review reports)
  visible_to_author boolean not null default true,
  uploaded_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (submission_id, kind, version)
);

create index submission_files_submission_idx on public.submission_files (submission_id, kind, version desc);

-- Status history and messages. `internal` events are never shown to authors.
create table public.submission_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  from_status public.submission_status,
  to_status public.submission_status,
  message text,
  visibility text not null default 'author' check (visibility in ('author', 'internal')),
  created_at timestamptz not null default now()
);

create index submission_events_submission_idx on public.submission_events (submission_id, created_at);

-- Every status change is recorded, whoever makes it.
create or replace function public.record_submission_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.submission_events (submission_id, actor_id, from_status, to_status, visibility)
    values (new.id, auth.uid(), old.status, new.status, 'author');
    insert into public.domain_events (type, aggregate_id, payload)
    values ('submission.status_changed', new.id,
            jsonb_build_object('from', old.status, 'to', new.status, 'public_id', new.public_id));
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Peer review (double-blind). Reviewers see only the anonymised manuscript,
-- title, abstract, keywords and category — never author identities.
-- ---------------------------------------------------------------------------

create table public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  round int not null default 1,
  status public.review_status not null default 'invited',
  due_at timestamptz not null,
  invited_by uuid references public.profiles (id),
  invited_at timestamptz not null default now(),
  responded_at timestamptz,
  recommendation public.review_recommendation,
  comments_to_author text,
  -- confidential: editors only
  comments_to_editor text,
  submitted_at timestamptz,
  last_reminded_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, reviewer_id, round)
);

create index review_assignments_reviewer_idx on public.review_assignments (reviewer_id, status);
create index review_assignments_submission_idx on public.review_assignments (submission_id, round);
create index review_assignments_due_idx on public.review_assignments (due_at) where status in ('invited', 'accepted');

create trigger review_assignments_touch before update on public.review_assignments
  for each row execute function public.touch_updated_at();
create trigger review_assignments_version before update on public.review_assignments
  for each row execute function public.bump_version();

-- A reviewer can only accept/decline and complete their own review; they can
-- never touch due dates, assignment or another reviewer's work.
create or replace function public.guard_review_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_editorial() or auth.uid() is null then
    return new;
  end if;
  if new.reviewer_id <> auth.uid() then
    raise exception 'Not your review' using errcode = '42501';
  end if;
  if (new.submission_id, new.reviewer_id, new.round, new.due_at, new.invited_by)
     is distinct from (old.submission_id, old.reviewer_id, old.round, old.due_at, old.invited_by) then
    raise exception 'Reviewers cannot change assignment details' using errcode = '42501';
  end if;
  if old.status in ('submitted', 'declined', 'cancelled') then
    raise exception 'This review is closed' using errcode = '42501';
  end if;
  if new.status = 'submitted' then
    if new.recommendation is null then
      raise exception 'A recommendation is required' using errcode = '23514';
    end if;
    new.submitted_at := now();
  end if;
  if new.status in ('accepted', 'declined') and old.status = 'invited' then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

create trigger review_assignments_guard before update on public.review_assignments
  for each row execute function public.guard_review_update();

-- Is the current user an active reviewer on this submission?
create or replace function public.is_assigned_reviewer(p_submission uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.review_assignments ra
    where ra.submission_id = p_submission
      and ra.reviewer_id = auth.uid()
      and ra.status in ('invited', 'accepted', 'submitted')
  ) and public.has_role('reviewer', 'editor', 'super_admin', 'book_review_editor')
$$;

-- What a reviewer may see of a submission: no author identities.
create or replace view public.reviewer_submissions
with (security_invoker = false)
as
select
  s.id,
  s.type,
  s.category_id,
  s.title,
  s.abstract,
  s.keywords,
  s.citation_style,
  ra.id as assignment_id,
  ra.round,
  ra.status as review_status,
  ra.due_at
from public.submissions s
join public.review_assignments ra on ra.submission_id = s.id
where ra.reviewer_id = auth.uid()
  and ra.status in ('invited', 'accepted', 'submitted');

revoke all on public.reviewer_submissions from anon;
grant select on public.reviewer_submissions to authenticated;

-- Can the current user manage this submission? Editors and Super Admins: all.
-- Book Review Editors: book-review submissions only.
create or replace function public.can_manage_submission(p_submission uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_editorial()
      or (public.has_role('book_review_editor')
          and exists (select 1 from public.submissions s where s.id = p_submission and s.type = 'book_review'))
$$;

-- Author withdraws a submission (only before acceptance).
create or replace function public.withdraw_submission(p_submission uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
begin
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null or s.author_id <> auth.uid() then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if s.status not in ('draft', 'awaiting_review_fee', 'submitted', 'under_screening',
                      'plagiarism_check', 'under_peer_review', 'revisions_requested', 'revised_received') then
    raise exception 'This submission can no longer be withdrawn' using errcode = 'P0001';
  end if;
  update public.submissions set status = 'withdrawn', decided_at = now() where id = p_submission;
  if p_reason is not null then
    insert into public.submission_events (submission_id, actor_id, message, visibility)
    values (p_submission, auth.uid(), p_reason, 'author');
  end if;
end;
$$;
