-- The nine areas of interest from the journal's flyer replace the eight
-- launch subject areas. Rows are changed only while they still carry their
-- original launch slug, so anything an editor has already renamed is left alone.
-- Literature (…02) and Translation Studies (…05) fold into
-- "Language, Literature and Linguistics" (…01); their ids are reused.

do $$
declare
  c1 constant uuid := 'c0000000-0000-4000-8000-000000000001';
  c2 constant uuid := 'c0000000-0000-4000-8000-000000000002';
  c5 constant uuid := 'c0000000-0000-4000-8000-000000000005';
begin
  if exists (select 1 from public.categories where id = c1 and slug = 'language-and-linguistics') then
    update public.articles set category_id = c1
      where category_id in (
        select id from public.categories
        where id in (c2, c5) and slug in ('literature-and-literary-studies', 'translation-studies'));
    update public.submissions set category_id = c1
      where category_id in (
        select id from public.categories
        where id in (c2, c5) and slug in ('literature-and-literary-studies', 'translation-studies'));
  end if;
end $$;

update public.categories as c set
  name = v.name, slug = v.slug, short_description = v.short_description,
  description = v.description, thread_color = v.thread_color, sort_order = v.sort_order
from (values
  ('c0000000-0000-4000-8000-000000000002'::uuid, 'literature-and-literary-studies',
   'Humanities and Social Sciences', 'humanities-and-social-sciences',
   'Human life, society and the past, studied through the humanities and social sciences.',
   'Scholarship on human experience, society and the past: history, archaeology, the arts, music, theatre and performance, sociology, anthropology, psychology and related fields. We welcome studies of Nigerian and African societies and comparative work that sets them beside other parts of the world.',
   '--thread-humanities', 1),
  ('c0000000-0000-4000-8000-000000000001'::uuid, 'language-and-linguistics',
   'Language, Literature and Linguistics', 'language-literature-and-linguistics',
   'Language in use and in structure, and literatures in every form, oral and written.',
   'Studies of the structure, acquisition, use and change of language, from phonology and syntax to sociolinguistics, discourse analysis and applied linguistics; criticism and scholarship on fiction, poetry, drama, life writing and oral literature; and translation and interpreting as practice and theory. JHTS particularly welcomes work on Nigerian and other African languages and literatures, on Nigerian English and World Englishes, and on multilingual practice.',
   '--thread-language', 2),
  ('c0000000-0000-4000-8000-000000000004'::uuid, 'communication-and-media-studies',
   'Communication and Media Studies', 'communication-and-media-studies',
   'Media, rhetoric and communication in print, broadcast and digital cultures.',
   'Studies of communication in its social settings: journalism, broadcasting, film, digital and social media, rhetoric, public relations and development communication, including the language and ethics of media in Nigeria and beyond.',
   '--thread-communication', 3),
  ('c0000000-0000-4000-8000-000000000007'::uuid, 'education-and-society',
   'Education and Pedagogy', 'education-and-pedagogy',
   'Teaching, learning and literacy in their social and institutional settings.',
   'Research on education as a social practice: language and literacy education, English for academic purposes, the teaching of the general studies curriculum, curriculum and policy, teacher education, assessment, and the place of the humanities in schools and universities.',
   '--thread-education', 4),
  ('c0000000-0000-4000-8000-000000000005'::uuid, 'translation-studies',
   'Technology, Innovation and Digital Cultures', 'technology-innovation-and-digital-cultures',
   'How digital tools and new technologies change language, culture, learning and society.',
   'Work on technology as a cultural and social force: digital humanities, computational and corpus approaches, artificial intelligence and language, online communities, digital literacies, e-learning, and innovation in Nigerian and African contexts.',
   '--thread-technology', 5),
  ('c0000000-0000-4000-8000-000000000003'::uuid, 'cultural-and-transcultural-studies',
   'Culture, Identity and Transcultural Studies', 'culture-identity-and-transcultural-studies',
   'How ideas, forms and identities travel, meet and change across borders.',
   'Research on how cultural forms, ideas and identities move across borders and are remade in the process: diaspora, migration, hybridity, popular and material culture, gender, ethnicity, heritage and the politics of representation. This is the journal’s home ground, and interdisciplinary approaches are encouraged.',
   '--thread-culture', 6),
  ('c0000000-0000-4000-8000-000000000006'::uuid, 'philosophy-history-and-the-arts',
   'Philosophy, Ethics and Religion', 'philosophy-ethics-and-religion',
   'Ideas, values and belief: African and comparative philosophy, ethics and religion.',
   'Philosophical, ethical and religious scholarship: African and comparative philosophy, applied and research ethics, religious studies, theology in its cultural setting, and the history of ideas.',
   '--thread-philosophy', 8),
  ('c0000000-0000-4000-8000-000000000008'::uuid, 'other-areas-of-the-humanities',
   'Interdisciplinary and Applied Research', 'interdisciplinary-and-applied-research',
   'Work that crosses disciplines, or applies humanities scholarship to practical problems.',
   'Research that crosses or sits between the areas above, and applied work that brings the humanities and social sciences to bear on practical problems in communities, institutions and industry. If you are unsure whether your work fits, please contact the editorial office before submitting.',
   '--thread-interdisciplinary', 9)
) as v(id, old_slug, name, slug, short_description, description, thread_color, sort_order)
where c.id = v.id and c.slug = v.old_slug;

insert into public.categories (id, name, slug, short_description, description, thread_color, sort_order) values (
  'c0000000-0000-4000-8000-000000000009',
  'Politics, Governance and Development', 'politics-governance-and-development',
  'Power, public life and development, read through language, culture and society.',
  'Studies of politics and public life: governance, democracy, policy, law and society, conflict and peace, and development, with attention to the role of language, media and culture in public reason in Nigeria, Africa and beyond.',
  '--thread-politics', 7
) on conflict do nothing;

-- Wording from the flyer, applied only where the launch sentence is unchanged
-- (replace() leaves edited text untouched).
update public.pages set
  body_html = replace(body_html,
    'JHTS publishes original, unpublished scholarship across the humanities, with a particular interest',
    'JHTS publishes original, unpublished scholarship across the humanities and social sciences, in language, literature and linguistics, communication and media, education, technology and digital cultures, politics and governance, and philosophy, ethics and religion, with a particular interest'),
  summary = replace(summary, 'Eight subject areas', 'Nine areas of interest')
where kind = 'page' and slug = 'aims-and-scope';

update public.call_for_papers set summary_html = replace(summary_html,
    'for its inaugural issue. Submissions are welcome across all eight subject areas of the journal, from language and linguistics to education and society.',
    'for its inaugural issue and forthcoming issues. Submissions are welcome across all nine areas of interest of the journal, from language, literature and linguistics to technology, innovation and digital cultures.');
