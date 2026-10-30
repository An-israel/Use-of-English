-- JHTS · 1100 · Payment flow: start, apply (idempotent), waive, expire; email log.
-- Reversal: supabase/rollbacks/20261030001100_payment_flow.down.sql

-- ---------------------------------------------------------------------------
-- Email log: every message the site sends (or would send without a provider)
-- ---------------------------------------------------------------------------

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email extensions.citext not null,
  subject text not null,
  template text not null,
  related_id uuid,
  status text not null default 'queued' check (status in ('queued', 'sent', 'logged', 'failed')),
  provider_id text,
  error text,
  -- one email per template per related row and recipient (idempotent sends)
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_related_idx on public.email_outbox (related_id);
create index email_outbox_created_idx on public.email_outbox (created_at desc);

alter table public.email_outbox enable row level security;
create policy "email_outbox: super admin reads" on public.email_outbox for select to authenticated
  using (public.has_role('super_admin'));
revoke insert, update, delete on public.email_outbox from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Start a payment: one pending row per attempt with a unique reference
--   JHTS-RF-2027-0042-1 (review fee) / JHTS-PF-2027-0042-1 (publication fee)
-- ---------------------------------------------------------------------------

create or replace function public.start_payment(p_submission uuid, p_fee public.fee_type, p_amount_kobo bigint)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
  n int;
  p public.payments;
  expected public.submission_status := case p_fee when 'review' then 'awaiting_review_fee' else 'accepted_awaiting_fee' end;
begin
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if s.status <> expected then raise exception 'This fee is not due' using errcode = 'P0001'; end if;
  if s.public_id is null then raise exception 'submission has no public id' using errcode = 'P0001'; end if;
  if exists (select 1 from public.payments where submission_id = s.id and fee_type = p_fee and status in ('success', 'waived')) then
    raise exception 'This fee has already been settled' using errcode = 'P0001';
  end if;

  -- Abandon earlier pending attempts so only the newest can succeed.
  update public.payments set status = 'abandoned'
   where submission_id = s.id and fee_type = p_fee and status = 'pending';

  select coalesce(max(attempt), 0) + 1 into n from public.payments where submission_id = s.id and fee_type = p_fee;
  insert into public.payments (reference, submission_id, author_id, fee_type, amount_kobo, attempt)
  values (
    format('JHTS-%s-%s-%s', case p_fee when 'review' then 'RF' else 'PF' end, substr(s.public_id, 6), n),
    s.id, s.author_id, p_fee, p_amount_kobo, n
  )
  returning * into p;
  return p;
end;
$$;

-- ---------------------------------------------------------------------------
-- Apply a verified success. Called only after the server has checked the
-- Paystack signature and re-verified the transaction. Idempotent: a second
-- call for the same reference changes nothing.
-- ---------------------------------------------------------------------------

create or replace function public.apply_payment_success(
  p_reference text,
  p_amount_kobo bigint,
  p_currency text,
  p_paystack_id bigint,
  p_channel text,
  p_paid_at timestamptz,
  p_raw jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
  s public.submissions;
begin
  -- Lock order: payment, then submission (consistent everywhere, item 40).
  select * into p from public.payments where reference = p_reference for update;
  if p.id is null then return 'unknown_reference'; end if;
  if p.status = 'success' then return 'duplicate'; end if;
  if p_currency <> p.currency or p_amount_kobo <> p.amount_kobo then
    insert into public.reconciliation_flags (run_date, payment_id, paystack_reference, kind, details)
    values (current_date, p.id, p_reference, 'amount_mismatch',
            jsonb_build_object('expected', p.amount_kobo, 'received', p_amount_kobo, 'currency', p_currency))
    on conflict do nothing;
    return 'amount_mismatch';
  end if;
  if exists (select 1 from public.payments where submission_id = p.submission_id and fee_type = p.fee_type
             and status in ('success', 'waived') and id <> p.id) then
    -- The fee was already settled (for example waived meanwhile): record and flag for a refund.
    insert into public.reconciliation_flags (run_date, payment_id, paystack_reference, kind, details)
    values (current_date, p.id, p_reference, 'status_mismatch', jsonb_build_object('reason', 'fee already settled'))
    on conflict do nothing;
  end if;

  update public.payments
     set status = 'success', paystack_id = p_paystack_id, channel = p_channel,
         paid_at = coalesce(p_paid_at, now()), raw = p_raw,
         receipt_number = coalesce(receipt_number, public.next_receipt_number())
   where id = p.id;

  select * into s from public.submissions where id = p.submission_id for update;
  if p.fee_type = 'review' and s.status = 'awaiting_review_fee' then
    update public.submissions
       set status = 'submitted', submitted_at = coalesce(submitted_at, now()), received_at = coalesce(received_at, current_date)
     where id = s.id;
  elsif p.fee_type = 'publication' and s.status = 'accepted_awaiting_fee' then
    update public.submissions set status = 'in_production' where id = s.id;
  end if;

  insert into public.domain_events (type, aggregate_id, payload)
  values ('payment.succeeded', p.id, jsonb_build_object('reference', p.reference, 'fee_type', p.fee_type, 'submission_id', p.submission_id));
  return 'applied';
end;
$$;

-- ---------------------------------------------------------------------------
-- Waive a fee (editors): a ₦0 "waived" payment keeps the trail complete.
-- ---------------------------------------------------------------------------

create or replace function public.waive_fee(p_submission uuid, p_fee public.fee_type, p_reason text)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
  p public.payments;
  n int;
begin
  if not public.is_editorial() then
    raise exception 'Only editors can waive fees' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = '23514';
  end if;
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if s.public_id is null then raise exception 'The author has not submitted this manuscript yet' using errcode = 'P0001'; end if;
  if exists (select 1 from public.payments where submission_id = s.id and fee_type = p_fee and status in ('success', 'waived')) then
    raise exception 'This fee has already been settled' using errcode = 'P0001';
  end if;

  update public.payments set status = 'abandoned' where submission_id = s.id and fee_type = p_fee and status = 'pending';
  select coalesce(max(attempt), 0) + 1 into n from public.payments where submission_id = s.id and fee_type = p_fee;
  insert into public.payments (reference, submission_id, author_id, fee_type, amount_kobo, status, waiver_reason, waived_by, paid_at, attempt)
  values (
    format('JHTS-%s-%s-W%s', case p_fee when 'review' then 'RF' else 'PF' end, substr(s.public_id, 6), n),
    s.id, s.author_id, p_fee, 0, 'waived', trim(p_reason), auth.uid(), now(), n
  )
  returning * into p;

  if p_fee = 'review' and s.status = 'awaiting_review_fee' then
    update public.submissions set status = 'submitted', submitted_at = coalesce(submitted_at, now()), received_at = coalesce(received_at, current_date) where id = s.id;
  elsif p_fee = 'publication' and s.status = 'accepted_awaiting_fee' then
    update public.submissions set status = 'in_production' where id = s.id;
  end if;

  insert into public.submission_events (submission_id, actor_id, message, visibility)
  values (s.id, auth.uid(), format('%s fee waived: %s', initcap(p_fee::text), trim(p_reason)), 'internal');
  insert into public.domain_events (type, aggregate_id, payload)
  values ('payment.waived', p.id, jsonb_build_object('fee_type', p_fee, 'submission_id', s.id));
  return p;
end;
$$;

-- Stale pending payments are abandoned (run by cron, item 7.1.7).
create or replace function public.expire_stale_payments(p_older_than interval default interval '2 hours')
returns int
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.payments set status = 'abandoned'
     where status = 'pending' and created_at < now() - p_older_than
    returning 1
  )
  select count(*)::int from expired
$$;

revoke execute on function public.start_payment(uuid, public.fee_type, bigint),
  public.apply_payment_success(text, bigint, text, bigint, text, timestamptz, jsonb),
  public.expire_stale_payments(interval)
from public, anon, authenticated;
grant execute on function public.start_payment(uuid, public.fee_type, bigint),
  public.apply_payment_success(text, bigint, text, bigint, text, timestamptz, jsonb),
  public.expire_stale_payments(interval)
to service_role;
revoke execute on function public.waive_fee(uuid, public.fee_type, text) from public, anon;
grant execute on function public.waive_fee(uuid, public.fee_type, text) to authenticated;

-- New submissions announce themselves once they leave draft.
create or replace function public.submission_created_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'draft' and new.status <> 'draft' then
    insert into public.domain_events (type, aggregate_id, payload)
    values ('submission.created', new.id, jsonb_build_object('public_id', new.public_id, 'status', new.status));
  end if;
  return new;
end;
$$;

create trigger submissions_created_event after update of status on public.submissions
  for each row execute function public.submission_created_event();
