drop view if exists public.fund_summary, public.payment_totals_by_month;
drop table if exists public.reconciliation_flags, public.refunds, public.payments cascade;
drop sequence if exists public.receipt_seq;
drop function if exists public.next_receipt_number(), public.guard_refund_total();
