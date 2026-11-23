-- The tagline reads "transcultural studies", as in the journal's name, not
-- "transcultural scholarship" (the Unit's correction, 23 November 2026).
-- Reversal: supabase/rollbacks/20261123000100_tagline_studies.down.sql
update public.site_settings
  set value = to_jsonb(replace(value #>> '{}', 'transcultural scholarship', 'transcultural studies'))
  where key = 'tagline' and value #>> '{}' like '%transcultural scholarship%';
