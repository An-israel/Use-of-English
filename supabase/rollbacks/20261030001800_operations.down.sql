drop table if exists public.backup_runs;
drop table if exists public.email_suppressions;
update public.email_outbox set status = 'failed' where status in ('bounced', 'complained', 'suppressed');
alter table public.email_outbox drop constraint email_outbox_status_check;
alter table public.email_outbox add constraint email_outbox_status_check
  check (status in ('queued', 'sent', 'logged', 'failed'));
drop trigger if exists payments_failed_event on public.payments;
drop function if exists public.payment_failed_event();
drop trigger if exists reconciliation_flags_notify on public.reconciliation_flags;
drop function if exists public.notify_reconciliation_flag();
drop trigger if exists domain_events_notify on public.domain_events;
drop function if exists public.notify_staff();
drop function if exists public.mark_notifications_seen();
alter table public.profiles drop column if exists notifications_seen_at;
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'staff_notifications') then
    alter publication supabase_realtime drop table public.staff_notifications;
  end if;
end $$;
drop table if exists public.staff_notifications;
