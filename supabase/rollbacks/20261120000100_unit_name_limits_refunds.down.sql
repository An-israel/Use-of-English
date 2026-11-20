-- Reverses 20261120000100_unit_name_limits_refunds.sql.
update public.site_settings
  set value = '"The Use of English Unit, the School of General Studies, UNN"'::jsonb
  where key = 'publisherShort' and value::text like '%(UNN)%';
update public.site_settings
  set value = replace(replace(value::text, 'University of Nigeria, Nsukka (UNN)', 'University of Nigeria, Nsukka'),
        'Use of English Unit, School of General Studies', 'Use of English Unit, the School of General Studies')::jsonb
  where value::text like '%Use of English Unit, School of General Studies%';

update public.pages
  set summary = replace(summary, 'Use of English Unit, School of General Studies', 'Use of English Unit, the School of General Studies'),
      body_html = replace(replace(replace(replace(replace(replace(replace(body_html,
        'its mandate within the University of Nigeria, Nsukka (UNN), and', 'its mandate within UNN and'),
        'Nsukka (UNN).</p>', 'Nsukka.</p>'),
        'Use of English Unit, School of General Studies', 'Use of English Unit, the School of General Studies'),
        '<li>Research articles and theoretical papers: up to 6,000 words, including references</li>',
        '<li>Research articles and theoretical papers: word limit <mark class="to-confirm">[TO CONFIRM]</mark></li>'),
        '<li>Critical reviews: up to 4,000 words, including references</li>',
        '<li>Critical reviews: word limit <mark class="to-confirm">[TO CONFIRM]</mark></li>'),
        '<li>Book reviews: up to 2,000 words</li>',
        '<li>Book reviews: word limit <mark class="to-confirm">[TO CONFIRM]</mark></li>'),
        '<p>Fees are non-refundable. The review and plagiarism-check fee covers the cost of review and administration, and the publication fee covers production, so neither is refunded once paid.</p>',
        '<p>Refund policy <mark class="to-confirm">[TO CONFIRM]</mark></p>');
