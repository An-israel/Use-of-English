drop trigger if exists submissions_created_event on public.submissions;
drop function if exists public.submission_created_event(), public.expire_stale_payments(interval),
  public.waive_fee(uuid, public.fee_type, text),
  public.apply_payment_success(text, bigint, text, bigint, text, timestamptz, jsonb),
  public.start_payment(uuid, public.fee_type, bigint);
drop table if exists public.email_outbox;
