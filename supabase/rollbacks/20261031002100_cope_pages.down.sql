delete from public.page_versions where page_id in (
  select id from public.pages
  where (kind, slug) in (('policy', 'reviewer-guidelines'), ('policy', 'generative-ai'),
                         ('policy', 'complaints-and-appeals'), ('page', 'faq')));
delete from public.pages
  where (kind, slug) in (('policy', 'reviewer-guidelines'), ('policy', 'generative-ai'),
                         ('policy', 'complaints-and-appeals'), ('page', 'faq'));
