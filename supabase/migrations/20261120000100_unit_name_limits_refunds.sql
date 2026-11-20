-- Feedback from the Unit (20 November 2026):
--  * the name is written "The Use of English Unit, School of General Studies,
--    University of Nigeria, Nsukka (UNN)": no "the" before School of General
--    Studies, and UNN in full;
--  * word limits: research articles and theoretical papers 6,000 words,
--    critical reviews 4,000 (both including references), book reviews 2,000;
--  * fees are non-refundable.
-- Stored pages and settings only (page_versions keeps its history).
-- Reversal: supabase/rollbacks/20261120000100_unit_name_limits_refunds.down.sql

update public.site_settings
  set value = replace(
        replace(
          replace(value::text, '"The Use of English Unit, the School of General Studies, UNN"',
                  '"The Use of English Unit, School of General Studies, University of Nigeria, Nsukka (UNN)"'),
          '"The Use of English Unit, the School of General Studies, University of Nigeria, Nsukka"',
          '"The Use of English Unit, School of General Studies, University of Nigeria, Nsukka (UNN)"'),
        'Use of English Unit, the School of General Studies', 'Use of English Unit, School of General Studies')::jsonb
  where value::text like '%Use of English Unit, the School of General Studies%';

update public.pages
  set summary = replace(summary, 'Use of English Unit, the School of General Studies', 'Use of English Unit, School of General Studies'),
      body_html = replace(replace(replace(replace(replace(replace(replace(body_html,
        '<p>JHTCS is published by the Use of English Unit, the School of General Studies, University of Nigeria, Nsukka.</p>',
        '<p>JHTCS is published by the Use of English Unit, School of General Studies, University of Nigeria, Nsukka (UNN).</p>'),
        '<p>JHTCS is published by the Use of English Unit of the School of General Studies at the University of Nigeria, Nsukka.</p>',
        '<p>JHTCS is published by the Use of English Unit of the School of General Studies at the University of Nigeria, Nsukka (UNN).</p>'),
        'its mandate within UNN and', 'its mandate within the University of Nigeria, Nsukka (UNN), and'),
        '<li>Research articles and theoretical papers: word limit <mark class="to-confirm">[TO CONFIRM]</mark></li>',
        '<li>Research articles and theoretical papers: up to 6,000 words, including references</li>'),
        '<li>Critical reviews: word limit <mark class="to-confirm">[TO CONFIRM]</mark></li>',
        '<li>Critical reviews: up to 4,000 words, including references</li>'),
        '<li>Book reviews: word limit <mark class="to-confirm">[TO CONFIRM]</mark></li>',
        '<li>Book reviews: up to 2,000 words</li>'),
        '<p>Refund policy <mark class="to-confirm">[TO CONFIRM]</mark></p>',
        '<p>Fees are non-refundable. The review and plagiarism-check fee covers the cost of review and administration, and the publication fee covers production, so neither is refunded once paid.</p>')
  where body_html ~ '(Use of English Unit, the School|Nsukka\.</p>|within UNN|word limit <mark|Refund policy <mark)'
     or summary like '%Use of English Unit, the School of General Studies%';

update public.pages set body_html = replace(body_html, 'Use of English Unit, the School of General Studies', 'Use of English Unit, School of General Studies')
  where body_html like '%Use of English Unit, the School of General Studies%';
