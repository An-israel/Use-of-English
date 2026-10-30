-- JHTS · 0100 · Extensions, enums, profiles and role helpers
-- Reversal: supabase/rollbacks/20261030000100_foundation.down.sql

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum (
  'super_admin',
  'editor',
  'book_review_editor',
  'finance_officer',
  'reviewer',
  'author'
);

create type public.article_type as enum (
  'research_article',
  'theoretical_paper',
  'critical_review',
  'book_review',
  'editorial'
);

create type public.citation_style as enum ('apa7', 'mla9');

create type public.publish_status as enum ('draft', 'scheduled', 'in_press', 'published', 'unpublished');

create type public.issue_status as enum ('draft', 'scheduled', 'published', 'unpublished');

create type public.submission_status as enum (
  'draft',
  'awaiting_review_fee',
  'submitted',
  'under_screening',
  'plagiarism_check',
  'under_peer_review',
  'revisions_requested',
  'revised_received',
  'accepted_awaiting_fee',
  'in_production',
  'published',
  'rejected',
  'withdrawn'
);

create type public.fee_type as enum ('review', 'publication');

create type public.payment_status as enum ('pending', 'success', 'failed', 'abandoned', 'waived', 'refunded');

create type public.board_group as enum (
  'editor_in_chief',
  'assistant_editors',
  'associate_editors',
  'book_review_editors',
  'managing_editors',
  'journal_consultants'
);

create type public.review_status as enum ('invited', 'accepted', 'declined', 'submitted', 'cancelled');

create type public.review_recommendation as enum ('accept', 'minor_revisions', 'major_revisions', 'reject');

-- ---------------------------------------------------------------------------
-- Shared trigger functions
-- ---------------------------------------------------------------------------

-- Timestamps always come from the database clock (engineering item 96).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Optimistic locking (item 36): every update bumps `version`. The server sends
-- the version it loaded and filters on it, so a stale save matches no rows.
create or replace function public.bump_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email extensions.citext not null unique,
  role public.app_role not null default 'author',
  affiliation text,
  orcid text check (orcid is null or orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
  is_active boolean not null default true,
  -- Reviewer expertise, used by editors when assigning reviews
  expertise text[] not null default '{}',
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role) where is_active;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- New auth users get an author profile. Invited staff are created with a role
-- in raw_app_meta_data by the server (service role), which only the server can set.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role := 'author';
begin
  if new.raw_app_meta_data ? 'jhts_role' then
    v_role := (new.raw_app_meta_data ->> 'jhts_role')::public.app_role;
  end if;

  insert into public.profiles (id, email, full_name, role, affiliation)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    new.raw_user_meta_data ->> 'affiliation'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role helpers used by every RLS policy
-- ---------------------------------------------------------------------------

create or replace function public.current_role_name()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create or replace function public.has_role(variadic roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_role_name() = any (roles), false)
$$;

-- Editors and Super Admins run the journal.
create or replace function public.is_editorial()
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.has_role('super_admin', 'editor')
$$;

-- Users may edit their own name, affiliation and ORCID, never their role or status.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and auth.uid() is not null
     and not public.has_role('super_admin') then
    raise exception 'Only a Super Admin can change roles or account status' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- There must always be at least one active Super Admin (item 39). The check
-- locks the Super Admin rows so two concurrent demotions cannot both pass.
create or replace function public.ensure_super_admin_remains()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  remaining int;
begin
  if old.role = 'super_admin' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'super_admin' or not new.is_active) then
    perform 1 from public.profiles where role = 'super_admin' and is_active order by id for update;
    select count(*) into remaining
      from public.profiles
      where role = 'super_admin' and is_active and id <> old.id;
    if remaining = 0 then
      raise exception 'There must always be at least one active Super Admin' using errcode = 'P0001';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger profiles_last_super_admin
  before update or delete on public.profiles
  for each row execute function public.ensure_super_admin_remains();
