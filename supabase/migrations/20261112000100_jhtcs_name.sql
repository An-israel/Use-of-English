-- The journal's abbreviation is JHTCS and its domain is www.jhtcs.org.
-- Reversal: supabase/rollbacks/20261112000100_jhtcs_name.down.sql
--
-- 1. New submission IDs, payment references and receipt numbers start with
--    JHTCS-. Existing ones keep the prefix they were issued with, so payment
--    references and receipts stay traceable. The functions are rewritten in
--    place from their live definitions, so nothing else in them changes.
--    Payment references used to cut the year and number out of the submission
--    ID by position (after "JHTS-"); they now strip whatever prefix it has.
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
    d := replace(d, '''JHTS-', '''JHTCS-');
    d := replace(d, 'substr(s.public_id, 6)', 'regexp_replace(s.public_id, ''^[A-Z]+-'', '''')');
    execute d;
  end loop;
end;
$$;

-- 2. Content shown on the site: pages, area descriptions and settings
--    (page history in page_versions is left as it was written).
update public.pages
  set summary = replace(replace(summary, 'jhts.unn.edu.ng', 'jhtcs.org'), 'JHTS', 'JHTCS'),
      body_html = replace(replace(body_html, 'jhts.unn.edu.ng', 'jhtcs.org'), 'JHTS', 'JHTCS')
  where summary like '%JHTS%' or body_html like '%JHTS%'
     or summary like '%jhts.unn.edu.ng%' or body_html like '%jhts.unn.edu.ng%';

update public.categories
  set description = replace(description, 'JHTS', 'JHTCS')
  where description like '%JHTS%';

update public.site_settings
  set value = replace(replace(value::text, 'jhts.unn.edu.ng', 'jhtcs.org'), 'JHTS', 'JHTCS')::jsonb
  where value::text like '%JHTS%' or value::text like '%jhts.unn.edu.ng%';
