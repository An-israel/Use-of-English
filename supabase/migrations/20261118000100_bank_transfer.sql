-- Fees are paid by bank transfer into the journal's Zenith Bank account
-- instead of through Paystack. The author transfers the fee, quoting the
-- submission ID, then uploads the transfer receipt; the Finance Officer (or a
-- Super Admin) checks it against the bank statement and confirms it, which
-- records the payment exactly as a successful online payment was recorded
-- (receipt number, official receipt, the submission moves on), or rejects it
-- with a reason the author sees.
-- Reversal: supabase/rollbacks/20261118000100_bank_transfer.down.sql

-- ---------------------------------------------------------------------------
-- Proof of payment on the payment row
-- ---------------------------------------------------------------------------
alter table public.payments
  add column proof_path text,
  add column proof_name text,
  add column transfer_payer text,
  add column transfer_date date,
  add column proof_submitted_at timestamptz,
  add column confirmed_by uuid references public.profiles (id),
  add column confirmed_at timestamptz,
  add column rejection_reason text,
  add column rejected_by uuid references public.profiles (id);

-- At most one transfer awaiting confirmation per fee.
create unique index payments_one_awaiting_per_fee on public.payments (submission_id, fee_type)
  where status = 'pending' and proof_submitted_at is not null;

-- Transfer receipts (PDF or photo) live in the private finance bucket under
-- proofs/<payment_id>/; only the server writes them.
update storage.buckets
   set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
 where id = 'finance';

-- Two new events: a receipt was uploaded, and Finance couldn't match one.
alter table public.domain_events drop constraint domain_events_type_check;
alter table public.domain_events add constraint domain_events_type_check check (type in (
  'submission.created', 'submission.status_changed', 'submission.revised', 'payment.succeeded', 'payment.failed',
  'payment.waived', 'payment.refunded', 'review.assigned', 'review.submitted', 'article.published',
  'article.unpublished', 'issue.published', 'book_review.published', 'page.updated', 'contact.received',
  'payment.proof_submitted', 'payment.rejected'
));

-- ---------------------------------------------------------------------------
-- The author's transfer, with its receipt (server only: it checks ownership)
-- ---------------------------------------------------------------------------
create or replace function public.submit_bank_transfer(
  p_submission uuid,
  p_fee public.fee_type,
  p_amount_kobo bigint,
  p_proof_path text,
  p_proof_name text,
  p_payer text,
  p_transfer_date date
)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions;
  p public.payments;
  n int;
  expected public.submission_status := case p_fee when 'review' then 'awaiting_review_fee' else 'accepted_awaiting_fee' end;
begin
  if coalesce(trim(p_payer), '') = '' or p_transfer_date is null or coalesce(p_proof_path, '') = '' then
    raise exception 'The payer, the transfer date and the receipt are required' using errcode = '23514';
  end if;
  if p_transfer_date > current_date + 1 then
    raise exception 'The transfer date can''t be in the future' using errcode = '23514';
  end if;
  select * into s from public.submissions where id = p_submission for update;
  if s.id is null then raise exception 'submission not found' using errcode = 'P0002'; end if;
  if s.status <> expected then raise exception 'This fee is not due' using errcode = 'P0001'; end if;
  if s.public_id is null then raise exception 'submission has no public id' using errcode = 'P0001'; end if;
  if exists (select 1 from public.payments where submission_id = s.id and fee_type = p_fee and status in ('success', 'waived')) then
    raise exception 'This fee has already been settled' using errcode = 'P0001';
  end if;

  -- A second upload while the first is still being checked replaces it.
  select * into p from public.payments
   where submission_id = s.id and fee_type = p_fee and status = 'pending' and proof_submitted_at is not null
   for update;
  if p.id is not null then
    update public.payments
       set proof_path = p_proof_path, proof_name = p_proof_name, transfer_payer = trim(p_payer),
           transfer_date = p_transfer_date, proof_submitted_at = now()
     where id = p.id
    returning * into p;
  else
    update public.payments set status = 'abandoned'
     where submission_id = s.id and fee_type = p_fee and status = 'pending';
    select coalesce(max(attempt), 0) + 1 into n from public.payments where submission_id = s.id and fee_type = p_fee;
    insert into public.payments (reference, submission_id, author_id, fee_type, amount_kobo, attempt, channel,
                                 proof_path, proof_name, transfer_payer, transfer_date, proof_submitted_at)
    values (
      format('JHTCS-%s-%s-%s', case p_fee when 'review' then 'RF' else 'PF' end,
             regexp_replace(s.public_id, '^[A-Z]+-', ''), n),
      s.id, s.author_id, p_fee, p_amount_kobo, n, 'bank_transfer',
      p_proof_path, p_proof_name, trim(p_payer), p_transfer_date, now()
    )
    returning * into p;
  end if;

  insert into public.submission_events (submission_id, actor_id, message, visibility)
  values (s.id, s.author_id, format('Proof of payment uploaded for the %s fee', p_fee::text), 'internal');
  insert into public.domain_events (type, aggregate_id, payload)
  values ('payment.proof_submitted', p.id,
          jsonb_build_object('reference', p.reference, 'fee_type', p_fee, 'submission_id', s.id));
  return p;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finance confirms the money arrived: recorded as a successful payment
-- ---------------------------------------------------------------------------
create or replace function public.confirm_bank_transfer(p_payment uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
  outcome text;
begin
  if not public.has_role('super_admin', 'finance_officer') then
    raise exception 'Only the Finance Officer or a Super Admin can confirm payments' using errcode = '42501';
  end if;
  select * into p from public.payments where id = p_payment for update;
  if p.id is null then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if p.status = 'success' then return 'duplicate'; end if;
  if p.status <> 'pending' or p.proof_submitted_at is null then
    raise exception 'This payment is not waiting for confirmation' using errcode = 'P0001';
  end if;

  outcome := public.apply_payment_success(
    p.reference, p.amount_kobo, p.currency, null, 'bank_transfer',
    coalesce(p.transfer_date::timestamptz, now()),
    jsonb_build_object('method', 'bank_transfer', 'payer', p.transfer_payer, 'transfer_date', p.transfer_date,
                       'confirmed_by', auth.uid())
  );
  update public.payments set confirmed_by = auth.uid(), confirmed_at = now() where id = p.id;
  insert into public.submission_events (submission_id, actor_id, message, visibility)
  values (p.submission_id, auth.uid(), format('%s fee payment confirmed (%s)', initcap(p.fee_type::text), p.reference),
          'internal');
  return outcome;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finance can't match the transfer: the author is told why and can try again
-- ---------------------------------------------------------------------------
create or replace function public.reject_bank_transfer(p_payment uuid, p_reason text)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
begin
  if not public.has_role('super_admin', 'finance_officer') then
    raise exception 'Only the Finance Officer or a Super Admin can reject payments' using errcode = '42501';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = '23514';
  end if;
  select * into p from public.payments where id = p_payment for update;
  if p.id is null then raise exception 'payment not found' using errcode = 'P0002'; end if;
  if p.status <> 'pending' or p.proof_submitted_at is null then
    raise exception 'This payment is not waiting for confirmation' using errcode = 'P0001';
  end if;
  update public.payments
     set status = 'failed', rejection_reason = trim(p_reason), rejected_by = auth.uid()
   where id = p.id
  returning * into p;
  insert into public.submission_events (submission_id, actor_id, message, visibility)
  values (p.submission_id, auth.uid(), format('Proof of payment not accepted: %s', trim(p_reason)), 'internal');
  insert into public.domain_events (type, aggregate_id, payload)
  values ('payment.rejected', p.id, jsonb_build_object('reference', p.reference, 'submission_id', p.submission_id));
  return p;
end;
$$;

revoke execute on function public.submit_bank_transfer(uuid, public.fee_type, bigint, text, text, text, date)
  from public, anon, authenticated;
grant execute on function public.submit_bank_transfer(uuid, public.fee_type, bigint, text, text, text, date)
  to service_role;
revoke execute on function public.confirm_bank_transfer(uuid), public.reject_bank_transfer(uuid, text)
  from public, anon;
grant execute on function public.confirm_bank_transfer(uuid), public.reject_bank_transfer(uuid, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications and housekeeping
-- ---------------------------------------------------------------------------

-- Finance hears about every transfer waiting to be checked.
create or replace function public.notify_payment_proof()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.staff_notifications (kind, title, body, href, roles)
    values ('payment', 'Bank transfer to confirm', coalesce(new.payload ->> 'reference', ''),
            '/admin/payments/' || new.aggregate_id, array['super_admin', 'finance_officer']::public.app_role[]);
  exception when others then
    raise warning 'notify_payment_proof skipped event %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

create trigger domain_events_notify_payment_proof after insert on public.domain_events
  for each row when (new.type = 'payment.proof_submitted')
  execute function public.notify_payment_proof();

-- A transfer Finance rejected is not a "failed payment" alert for Finance.
create or replace function public.payment_failed_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'failed' and old.status is distinct from 'failed' and new.rejection_reason is null then
    insert into public.domain_events (type, aggregate_id, payload)
    values ('payment.failed', new.id, jsonb_build_object('reference', new.reference, 'submission_id', new.submission_id));
  end if;
  return new;
end;
$$;

-- Transfers waiting to be checked never expire; only old unpaid card
-- attempts (from before bank transfer) are tidied away.
create or replace function public.expire_stale_payments(p_older_than interval default interval '2 hours')
returns int
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.payments set status = 'abandoned'
     where status = 'pending' and proof_submitted_at is null and created_at < now() - p_older_than
    returning 1
  )
  select count(*)::int from expired
$$;

-- ---------------------------------------------------------------------------
-- The stored "Fees and Payment" and privacy pages describe the new method
-- ---------------------------------------------------------------------------
update public.pages
   set body_html = replace(body_html, '<p>Fees are paid securely online through Paystack by card, bank transfer or USSD. JHTCS never sees or stores your card details. You receive an emailed receipt and can download it from your dashboard at any time.</p>', '<p>Fees are paid by bank transfer into the journal’s account: <strong>Journal of Humanities and Transcultural Studies</strong>, Zenith Bank PLC, account number <strong>1313504238</strong>. Write your submission ID (for example JHTCS-2027-0042) in the transfer description, then upload the transfer receipt or bank teller on your dashboard. Once the Finance Officer has confirmed the payment, your manuscript moves on and you receive an official receipt by email, which you can also download from your dashboard at any time.</p>')
 where body_html like '%through Paystack by card%';
update public.pages
   set body_html = replace(body_html, '<li><strong>Payment records:</strong> the amount, date, reference and status of each payment. Card details are handled entirely by Paystack and never reach us.</li>', '<li><strong>Payment records:</strong> the amount, date, reference and status of each payment, the name of the payer and the transfer receipt you upload. We never ask for card details or bank log-in details.</li>')
 where body_html like '%handled entirely by Paystack%';
