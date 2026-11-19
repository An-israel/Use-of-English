-- Reverses 20261118000100_bank_transfer.sql.
update public.pages
   set body_html = replace(body_html, '<li><strong>Payment records:</strong> the amount, date, reference and status of each payment, the name of the payer and the transfer receipt you upload. We never ask for card details or bank log-in details.</li>', '<li><strong>Payment records:</strong> the amount, date, reference and status of each payment. Card details are handled entirely by Paystack and never reach us.</li>')
 where body_html like '%bank log-in details%';
update public.pages
   set body_html = replace(body_html, '<p>Fees are paid by bank transfer into the journal’s account: <strong>Journal of Humanities and Transcultural Studies</strong>, Zenith Bank PLC, account number <strong>1313504238</strong>. Write your submission ID (for example JHTCS-2027-0042) in the transfer description, then upload the transfer receipt or bank teller on your dashboard. Once the Finance Officer has confirmed the payment, your manuscript moves on and you receive an official receipt by email, which you can also download from your dashboard at any time.</p>', '<p>Fees are paid securely online through Paystack by card, bank transfer or USSD. JHTCS never sees or stores your card details. You receive an emailed receipt and can download it from your dashboard at any time.</p>')
 where body_html like '%account number <strong>1313504238</strong>%';

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

drop trigger if exists domain_events_notify_payment_proof on public.domain_events;
drop function if exists public.notify_payment_proof();
drop function if exists public.reject_bank_transfer(uuid, text);
drop function if exists public.confirm_bank_transfer(uuid);
drop function if exists public.submit_bank_transfer(uuid, public.fee_type, bigint, text, text, text, date);

delete from public.domain_events where type in ('payment.proof_submitted', 'payment.rejected');
alter table public.domain_events drop constraint domain_events_type_check;
alter table public.domain_events add constraint domain_events_type_check check (type in (
  'submission.created', 'submission.status_changed', 'submission.revised', 'payment.succeeded', 'payment.failed',
  'payment.waived', 'payment.refunded', 'review.assigned', 'review.submitted', 'article.published',
  'article.unpublished', 'issue.published', 'book_review.published', 'page.updated', 'contact.received'
));

update storage.buckets set allowed_mime_types = array['application/pdf'] where id = 'finance';

drop index if exists public.payments_one_awaiting_per_fee;
alter table public.payments
  drop column rejected_by,
  drop column rejection_reason,
  drop column confirmed_at,
  drop column confirmed_by,
  drop column proof_submitted_at,
  drop column transfer_date,
  drop column transfer_payer,
  drop column proof_name,
  drop column proof_path;
