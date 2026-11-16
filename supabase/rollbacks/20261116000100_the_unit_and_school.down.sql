-- Reverses 20261116000100_the_unit_and_school.sql.
update public.pages
  set summary = replace(summary, 'Use of English Unit, the School of General Studies', 'Use of English Unit, School of General Studies'),
      body_html = replace(body_html, 'Use of English Unit, the School of General Studies', 'Use of English Unit, School of General Studies')
  where summary like '%Use of English Unit, the School of General Studies%'
     or body_html like '%Use of English Unit, the School of General Studies%';

update public.site_settings
  set value = replace(
        replace(value::text, 'Use of English Unit, the School of General Studies', 'Use of English Unit, School of General Studies'),
        '"The Use of English Unit, School of General Studies, UNN"', '"Use of English Unit, School of General Studies, UNN"')::jsonb
  where value::text like '%Use of English Unit, the School of General Studies%';
