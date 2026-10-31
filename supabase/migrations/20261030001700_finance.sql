-- JHTS · 1700 · Finance views: the payments ledger, refunds and reconciliation.
-- Reversal: supabase/rollbacks/20261030001700_finance.down.sql

-- Recording a refund marks a fully refunded payment as "refunded". Payments are
-- never writable by signed-in users, so the trigger runs with the definer's
-- rights; who may insert a refund is still decided by RLS on refunds.
alter function public.guard_refund_total() security definer;

-- Refunds are domain events too.
alter table public.domain_events drop constraint domain_events_type_check;
alter table public.domain_events add constraint domain_events_type_check check (type in (
  'submission.created', 'submission.status_changed', 'submission.revised',
  'payment.succeeded', 'payment.failed', 'payment.waived', 'payment.refunded',
  'review.assigned', 'review.submitted',
  'article.published', 'article.unpublished', 'issue.published',
  'book_review.published', 'page.updated', 'contact.received'
));

create or replace function public.refund_recorded_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.domain_events (type, aggregate_id, payload)
  values ('payment.refunded', new.payment_id, jsonb_build_object('refund_id', new.id, 'amount_kobo', new.amount_kobo));
  return new;
end;
$$;

create trigger refunds_event after insert on public.refunds
  for each row execute function public.refund_recorded_event();

-- One row per payment with what the finance screens filter and total by:
-- payer, submission, the issue the resulting article is in, and refunds.
-- Staff only (Super Admin, Finance Officer, Editor), checked in the view
-- itself so finance staff can see issue placement of unpublished articles.
create or replace view public.payment_ledger
with (security_invoker = false)
as
select
  p.id,
  p.reference,
  p.fee_type,
  p.status,
  p.amount_kobo,
  coalesce(r.refunded, 0)::bigint as refunded_kobo,
  case when p.status in ('success', 'refunded') then p.amount_kobo - coalesce(r.refunded, 0) else 0 end::bigint as net_kobo,
  p.paid_at,
  p.created_at,
  coalesce(p.paid_at, p.created_at) as activity_at,
  p.channel,
  p.receipt_number,
  p.waiver_reason,
  p.attempt,
  s.id as submission_id,
  s.public_id,
  s.title,
  pr.full_name as payer_name,
  pr.email::text as payer_email,
  a.issue_id
from public.payments p
join public.submissions s on s.id = p.submission_id
join public.profiles pr on pr.id = p.author_id
left join public.articles a on a.id = s.article_id and a.deleted_at is null
left join lateral (select sum(amount_kobo) as refunded from public.refunds where payment_id = p.id) r on true
where public.has_role('super_admin', 'finance_officer', 'editor');

revoke all on public.payment_ledger from anon;
grant select on public.payment_ledger to authenticated;
