-- JHTS · 1800 · Operations: live staff notifications, email bounces,
-- backup records and failed-payment events.
-- Reversal: supabase/rollbacks/20261030001800_operations.down.sql

-- ---------------------------------------------------------------------------
-- Live notifications for staff (item 16): written from domain events and
-- reconciliation flags, read through RLS and pushed by Supabase Realtime.
-- ---------------------------------------------------------------------------

create table public.staff_notifications (
  id bigint generated always as identity primary key,
  kind text not null,
  title text not null,
  body text not null default '',
  href text not null,
  roles public.app_role[] not null,
  created_at timestamptz not null default now()
);

create index staff_notifications_created_idx on public.staff_notifications (created_at desc);

alter table public.staff_notifications enable row level security;
create policy "notifications: staff in audience" on public.staff_notifications for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = any (roles)));

-- Realtime delivers inserts to subscribers who may read the row (RLS applies).
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.staff_notifications;
  end if;
end $$;

alter table public.profiles add column notifications_seen_at timestamptz;

-- Marking notifications seen uses the database clock (item 96).
create or replace function public.mark_notifications_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set notifications_seen_at = now() where id = auth.uid()
$$;
revoke execute on function public.mark_notifications_seen() from public, anon;
grant execute on function public.mark_notifications_seen() to authenticated;

create or replace function public.notify_staff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub_id uuid;
  sub_label text := '';
  sub_type public.article_type;
  sub_status public.submission_status;
  editors public.app_role[] := array['super_admin', 'editor']::public.app_role[];
begin
  -- Notifications must never break the action that raised the event.
  begin
    if new.type in ('submission.status_changed', 'submission.created', 'submission.revised', 'review.submitted') then
      select id, coalesce(public_id, '') || ' · ' || title, type, status
        into sub_id, sub_label, sub_type, sub_status
        from public.submissions
       where id = case when new.type = 'review.submitted' then (new.payload ->> 'submission_id')::uuid else new.aggregate_id end;
      if sub_id is null then return new; end if;
      if sub_type = 'book_review' then editors := editors || 'book_review_editor'::public.app_role; end if;
    end if;

    if (new.type = 'submission.status_changed' and new.payload ->> 'to' = 'submitted')
       or (new.type = 'submission.created' and sub_status = 'submitted') then
      insert into public.staff_notifications (kind, title, body, href, roles)
      values ('submission', 'New submission ready for screening', sub_label, '/admin/submissions/' || sub_id, editors);
    elsif new.type = 'submission.revised'
       or (new.type = 'submission.status_changed' and new.payload ->> 'to' = 'revised_received') then
      insert into public.staff_notifications (kind, title, body, href, roles)
      values ('revision', 'Revised manuscript received', sub_label, '/admin/submissions/' || sub_id, editors);
    elsif new.type = 'review.submitted' then
      insert into public.staff_notifications (kind, title, body, href, roles)
      values ('review', 'A review has been submitted', sub_label, '/admin/submissions/' || sub_id, editors);
    elsif new.type = 'payment.failed' then
      insert into public.staff_notifications (kind, title, body, href, roles)
      values ('payment', 'A payment failed', coalesce(new.payload ->> 'reference', ''),
              '/admin/payments/' || new.aggregate_id, array['super_admin', 'finance_officer']::public.app_role[]);
    elsif new.type = 'contact.received' then
      insert into public.staff_notifications (kind, title, body, href, roles)
      values ('message', 'New message from the contact form', coalesce(new.payload ->> 'subject', ''),
              '/admin/messages', array['super_admin', 'editor']::public.app_role[]);
    end if;
  exception when others then
    raise warning 'notify_staff skipped % event %: %', new.type, new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger domain_events_notify after insert on public.domain_events
  for each row execute function public.notify_staff();

create or replace function public.notify_reconciliation_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.staff_notifications (kind, title, body, href, roles)
  values ('reconciliation', 'Payment mismatch found', coalesce(new.paystack_reference, '') || ' · ' || new.kind,
          '/admin/reconciliation', array['super_admin', 'finance_officer']::public.app_role[]);
  return new;
end;
$$;

create trigger reconciliation_flags_notify after insert on public.reconciliation_flags
  for each row execute function public.notify_reconciliation_flag();

-- A payment that fails becomes a domain event (it had none before).
create or replace function public.payment_failed_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'failed' and old.status is distinct from 'failed' then
    insert into public.domain_events (type, aggregate_id, payload)
    values ('payment.failed', new.id, jsonb_build_object('reference', new.reference, 'submission_id', new.submission_id));
  end if;
  return new;
end;
$$;

create trigger payments_failed_event after update of status on public.payments
  for each row execute function public.payment_failed_event();

-- ---------------------------------------------------------------------------
-- Email bounces and complaints (item 101): the provider's signed webhook
-- records them, and later mail to that address is suppressed.
-- ---------------------------------------------------------------------------

alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check
  check (status in ('queued', 'sent', 'logged', 'failed', 'bounced', 'complained', 'suppressed'));

create table public.email_suppressions (
  email extensions.citext primary key,
  reason text not null check (reason in ('bounced', 'complained', 'manual')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.email_suppressions enable row level security;
create policy "suppressions: super admin" on public.email_suppressions for all to authenticated
  using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- ---------------------------------------------------------------------------
-- Backups (item 84): each weekly off-site export reports here, so a missed or
-- failed backup raises an alert and shows on the System screen.
-- ---------------------------------------------------------------------------

create table public.backup_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running', 'ok', 'failed')),
  location text,
  details jsonb not null default '{}'::jsonb
);

alter table public.backup_runs enable row level security;
create policy "backups: super admin reads" on public.backup_runs for select to authenticated
  using (public.has_role('super_admin'));
