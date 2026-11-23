-- Reverses 20261123000100_tagline_studies.sql.
update public.site_settings
  set value = to_jsonb(replace(value #>> '{}', 'transcultural studies', 'transcultural scholarship'))
  where key = 'tagline' and value #>> '{}' = 'A quarterly journal of humanities and transcultural studies';
