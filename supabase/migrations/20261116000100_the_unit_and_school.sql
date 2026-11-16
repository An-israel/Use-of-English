-- "the" before the Use of English Unit and before the School of General
-- Studies, as the Unit asked: "the Use of English Unit, the School of General
-- Studies, University of Nigeria, Nsukka". Stored pages and settings only
-- (page history in page_versions is left as it was written).
-- Reversal: supabase/rollbacks/20261116000100_the_unit_and_school.down.sql
update public.pages
  set summary = replace(summary, 'Use of English Unit, School of General Studies', 'Use of English Unit, the School of General Studies'),
      body_html = replace(body_html, 'Use of English Unit, School of General Studies', 'Use of English Unit, the School of General Studies')
  where summary like '%Use of English Unit, School of General Studies%'
     or body_html like '%Use of English Unit, School of General Studies%';

update public.site_settings
  set value = replace(
        replace(value::text, 'Use of English Unit, School of General Studies', 'Use of English Unit, the School of General Studies'),
        '"Use of English Unit', '"The Use of English Unit')::jsonb
  where value::text like '%Use of English Unit, School of General Studies%'
     or value::text like '%"Use of English Unit%';
