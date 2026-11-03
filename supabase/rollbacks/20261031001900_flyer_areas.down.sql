-- Restores the eight launch subject areas. Articles moved into "Language,
-- Literature and Linguistics" stay there (the move cannot be told apart from
-- later choices); articles in the new ninth area move to the eighth.
update public.articles set category_id = 'c0000000-0000-4000-8000-000000000008'
  where category_id = 'c0000000-0000-4000-8000-000000000009';
update public.submissions set category_id = 'c0000000-0000-4000-8000-000000000008'
  where category_id = 'c0000000-0000-4000-8000-000000000009';
delete from public.categories where id = 'c0000000-0000-4000-8000-000000000009'
  and slug = 'politics-governance-and-development';

update public.categories as c set name = v.name, slug = v.slug, thread_color = v.thread_color, sort_order = v.sort_order
from (values
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'language-literature-and-linguistics', 'Language and Linguistics', 'language-and-linguistics', '--thread-language', 1),
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'humanities-and-social-sciences', 'Literature and Literary Studies', 'literature-and-literary-studies', '--thread-literature', 2),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'culture-identity-and-transcultural-studies', 'Cultural and Transcultural Studies', 'cultural-and-transcultural-studies', '--thread-culture', 3),
  ('c0000000-0000-4000-8000-000000000004'::uuid, 'communication-and-media-studies', 'Communication and Media Studies', 'communication-and-media-studies', '--thread-communication', 4),
  ('c0000000-0000-4000-8000-000000000005'::uuid, 'technology-innovation-and-digital-cultures', 'Translation Studies', 'translation-studies', '--thread-translation', 5),
  ('c0000000-0000-4000-8000-000000000006'::uuid, 'philosophy-ethics-and-religion', 'Philosophy, History and the Arts', 'philosophy-history-and-the-arts', '--thread-philosophy', 6),
  ('c0000000-0000-4000-8000-000000000007'::uuid, 'education-and-pedagogy', 'Education and Society', 'education-and-society', '--thread-education', 7),
  ('c0000000-0000-4000-8000-000000000008'::uuid, 'interdisciplinary-and-applied-research', 'Other Areas of the Humanities', 'other-areas-of-the-humanities', '--thread-other', 8)
) as v(id, new_slug, name, slug, thread_color, sort_order)
where c.id = v.id and c.slug = v.new_slug;
-- The page and Call for Papers wording is left as it is: it reads correctly either way.
