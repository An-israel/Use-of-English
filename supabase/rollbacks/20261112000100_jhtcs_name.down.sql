-- Reverses 20261112000100_jhtcs_name.sql: JHTS- prefixes and the old domain.
do $$
declare
  f text;
  d text;
begin
  foreach f in array array[
    'public.next_submission_public_id()',
    'public.next_receipt_number()',
    'public.start_payment(uuid, public.fee_type, bigint)',
    'public.waive_fee(uuid, public.fee_type, text)'
  ] loop
    d := pg_get_functiondef(f::regprocedure);
    d := replace(d, '''JHTCS-', '''JHTS-');
    d := replace(d, 'regexp_replace(s.public_id, ''^[A-Z]+-'', '''')', 'substr(s.public_id, 6)');
    execute d;
  end loop;
end;
$$;

update public.pages
  set summary = replace(replace(summary, 'JHTCS', 'JHTS'), 'jhtcs.org', 'jhts.unn.edu.ng'),
      body_html = replace(replace(body_html, 'JHTCS', 'JHTS'), 'jhtcs.org', 'jhts.unn.edu.ng')
  where summary like '%JHTCS%' or body_html like '%JHTCS%'
     or summary like '%jhtcs.org%' or body_html like '%jhtcs.org%';

update public.categories
  set description = replace(description, 'JHTCS', 'JHTS')
  where description like '%JHTCS%';

update public.site_settings
  set value = replace(replace(value::text, 'JHTCS', 'JHTS'), 'jhtcs.org', 'jhts.unn.edu.ng')::jsonb
  where value::text like '%JHTCS%' or value::text like '%jhtcs.org%';
