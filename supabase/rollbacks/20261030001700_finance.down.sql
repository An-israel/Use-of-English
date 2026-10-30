drop view if exists public.payment_ledger;
drop trigger if exists refunds_event on public.refunds;
drop function if exists public.refund_recorded_event();
alter function public.guard_refund_total() security invoker;
delete from public.domain_events where type = 'payment.refunded';
alter table public.domain_events drop constraint domain_events_type_check;
alter table public.domain_events add constraint domain_events_type_check check (type in (
  'submission.created', 'submission.status_changed', 'submission.revised',
  'payment.succeeded', 'payment.failed', 'payment.waived',
  'review.assigned', 'review.submitted',
  'article.published', 'article.unpublished', 'issue.published',
  'book_review.published', 'page.updated', 'contact.received'
));
