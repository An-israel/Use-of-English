-- JHTS · 0400 · Payments, refunds and reconciliation
-- Reversal: supabase/rollbacks/20261030000400_payments.down.sql
--
-- Payment rows are written only by server code using the service role:
-- the Paystack webhook is the single source of truth (section 7.1).

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- e.g. JHTS-RF-2027-0042-1 (review fee) or JHTS-PF-2027-0042-1 (publication fee)
  reference text not null unique,
  submission_id uuid not null references public.submissions (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  fee_type public.fee_type not null,
  -- amount at the time of payment, from settings (never re-read later)
  amount_kobo bigint not null check (amount_kobo >= 0),
  currency text not null default 'NGN' check (currency = 'NGN'),
  status public.payment_status not null default 'pending',
  paystack_id bigint unique,
  channel text,
  paid_at timestamptz,
  waiver_reason text,
  waived_by uuid references public.profiles (id),
  receipt_number text unique,
  receipt_path text,
  raw jsonb,
  attempt int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'waived' or (amount_kobo = 0 and waiver_reason is not null and waived_by is not null))
);

create index payments_submission_idx on public.payments (submission_id, fee_type);
create index payments_author_idx on public.payments (author_id, created_at desc);
create index payments_status_idx on public.payments (status, created_at desc);
create index payments_paid_at_idx on public.payments (paid_at desc) where status = 'success';
-- A fee can be settled only once per submission.
create unique index payments_one_settled_per_fee on public.payments (submission_id, fee_type)
  where status in ('success', 'waived');

create trigger payments_touch before update on public.payments
  for each row execute function public.touch_updated_at();

-- Sequential receipt numbers: JHTS-R-2027-000123
create sequence public.receipt_seq;

create or replace function public.next_receipt_number()
returns text
language sql
security definer
set search_path = ''
as $$
  select format('JHTS-R-%s-%s', extract(year from now())::int, lpad(nextval('public.receipt_seq')::text, 6, '0'))
$$;

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount_kobo bigint not null check (amount_kobo > 0),
  reason text not null,
  refunded_on date not null,
  paystack_refund_reference text,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index refunds_payment_idx on public.refunds (payment_id);

-- Refunds may never exceed what was paid.
create or replace function public.guard_refund_total()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  paid bigint;
  refunded bigint;
begin
  select amount_kobo into paid from public.payments where id = new.payment_id and status in ('success', 'refunded') for update;
  if paid is null then
    raise exception 'Only successful payments can be refunded' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_kobo), 0) into refunded from public.refunds where payment_id = new.payment_id;
  if refunded + new.amount_kobo > paid then
    raise exception 'Refunds exceed the amount paid' using errcode = 'P0001';
  end if;
  if refunded + new.amount_kobo = paid then
    update public.payments set status = 'refunded' where id = new.payment_id;
  end if;
  return new;
end;
$$;

create trigger refunds_guard before insert on public.refunds
  for each row execute function public.guard_refund_total();

create table public.reconciliation_flags (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  payment_id uuid references public.payments (id) on delete set null,
  paystack_reference text,
  kind text not null check (kind in ('missing_in_db', 'missing_in_paystack', 'amount_mismatch', 'status_mismatch')),
  details jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id),
  resolution_note text,
  created_at timestamptz not null default now(),
  unique (run_date, paystack_reference, kind)
);

create index reconciliation_open_idx on public.reconciliation_flags (created_at desc) where resolved_at is null;

-- Finance views (section 7.3). security_invoker so RLS on payments applies.
create or replace view public.payment_totals_by_month
with (security_invoker = true)
as
select
  date_trunc('month', p.paid_at) as month,
  p.fee_type,
  count(*) as payments,
  sum(p.amount_kobo) as collected_kobo,
  coalesce(sum(r.refunded), 0) as refunded_kobo
from public.payments p
left join lateral (
  select sum(amount_kobo) as refunded from public.refunds where payment_id = p.id
) r on true
where p.status in ('success', 'refunded')
group by 1, 2;

create or replace view public.fund_summary
with (security_invoker = true)
as
select
  coalesce(sum(p.amount_kobo), 0) as collected_kobo,
  coalesce((select sum(amount_kobo) from public.refunds), 0) as refunded_kobo,
  coalesce(sum(p.amount_kobo), 0) - coalesce((select sum(amount_kobo) from public.refunds), 0) as net_kobo,
  count(*) filter (where p.fee_type = 'review') as review_fees,
  count(*) filter (where p.fee_type = 'publication') as publication_fees
from public.payments p
where p.status in ('success', 'refunded');
