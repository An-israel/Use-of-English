-- Reverses 20261120000200_unn_in_full.sql.
update public.pages
  set body_html = replace(body_html, 'the School of General Studies and the University of Nigeria, Nsukka (UNN), and opens',
                          'the School of General Studies and UNN, and opens')
  where body_html like '%the School of General Studies and the University of Nigeria, Nsukka (UNN), and opens%';
