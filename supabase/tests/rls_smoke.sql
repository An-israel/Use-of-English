-- RLS smoke tests. Run against a migrated database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -o /dev/null -f supabase/tests/rls_smoke.sql
-- Everything runs in a transaction that is rolled back.

begin;

create or replace function pg_temp.as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', uid::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Users (handle_new_user creates the profiles)
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-a000-00000000000a', 'author.a@example.test', '{}', '{"full_name":"Author A"}'),
  ('00000000-0000-4000-a000-00000000000b', 'author.b@example.test', '{}', '{"full_name":"Author B"}'),
  ('00000000-0000-4000-a000-00000000000c', 'reviewer@example.test', '{"jhts_role":"reviewer"}', '{"full_name":"Reviewer R"}'),
  ('00000000-0000-4000-a000-00000000000d', 'editor@example.test', '{"jhts_role":"editor"}', '{"full_name":"Editor E"}'),
  ('00000000-0000-4000-a000-00000000000e', 'admin@example.test', '{"jhts_role":"super_admin"}', '{"full_name":"Admin S"}'),
  ('00000000-0000-4000-a000-00000000000f', 'brev@example.test', '{"jhts_role":"book_review_editor"}', '{"full_name":"Book Review Editor"}');

select pg_temp.check((select role from public.profiles where id = '00000000-0000-4000-a000-00000000000a') = 'author', 'self-registered users are authors');

-- Author A creates a draft with an author list
select pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
insert into public.submissions (id, author_id, type, title) values
  ('11111111-0000-4000-a000-000000000001', '00000000-0000-4000-a000-00000000000a', 'research_article', 'A study');
insert into public.submission_authors (submission_id, position, name, email, is_corresponding) values
  ('11111111-0000-4000-a000-000000000001', 1, 'Author A', 'author.a@example.test', true);
select pg_temp.check((select count(*) from public.submissions) = 1, 'author sees own submission');

-- Author A cannot promote themselves
do $$ begin
  update public.profiles set role = 'super_admin' where id = '00000000-0000-4000-a000-00000000000a';
  raise exception 'FAILED: author changed own role';
exception when insufficient_privilege then raise notice 'ok - author cannot change own role';
end $$;

-- Author A cannot move a draft out of draft status
do $$ begin
  update public.submissions set status = 'submitted' where id = '11111111-0000-4000-a000-000000000001';
  raise exception 'FAILED: author changed submission status';
exception when insufficient_privilege then raise notice 'ok - author cannot change submission status';
end $$;
reset role;

-- Author B sees nothing of A's work
select pg_temp.as_user('00000000-0000-4000-a000-00000000000b');
select pg_temp.check((select count(*) from public.submissions) = 0, 'other authors cannot see the submission');
select pg_temp.check((select count(*) from public.submission_authors) = 0, 'other authors cannot see co-authors');
reset role;

-- Editor moves it to peer review and assigns the reviewer
select pg_temp.as_user('00000000-0000-4000-a000-00000000000d');
update public.submissions set status = 'under_peer_review' where id = '11111111-0000-4000-a000-000000000001';
insert into public.review_assignments (submission_id, reviewer_id, due_at, invited_by) values
  ('11111111-0000-4000-a000-000000000001', '00000000-0000-4000-a000-00000000000c', now() + interval '21 days', '00000000-0000-4000-a000-00000000000d');
select pg_temp.check((select count(*) from public.submission_events where submission_id = '11111111-0000-4000-a000-000000000001') = 1,
  'status change is recorded in history');
reset role;

-- Reviewer: sees the anonymised view only, never author identities
select pg_temp.as_user('00000000-0000-4000-a000-00000000000c');
select pg_temp.check((select count(*) from public.reviewer_submissions) = 1, 'reviewer sees assigned submission via view');
select pg_temp.check((select count(*) from public.submissions) = 0, 'reviewer cannot read submissions table');
select pg_temp.check((select count(*) from public.submission_authors) = 0, 'reviewer cannot see authors');
select pg_temp.check((select count(*) from public.profiles) = 1, 'reviewer sees only own profile');
update public.review_assignments set status = 'accepted' where reviewer_id = '00000000-0000-4000-a000-00000000000c';
do $$ begin
  update public.review_assignments set due_at = now() + interval '90 days' where reviewer_id = '00000000-0000-4000-a000-00000000000c';
  raise exception 'FAILED: reviewer changed due date';
exception when insufficient_privilege then raise notice 'ok - reviewer cannot change due date';
end $$;
update public.review_assignments set status = 'submitted', recommendation = 'minor_revisions'
  where reviewer_id = '00000000-0000-4000-a000-00000000000c';
reset role;
select pg_temp.check((select submitted_at is not null from public.review_assignments limit 1), 'review submission is timestamped');

-- After submission the author can no longer change the author list
select pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
delete from public.submission_authors where submission_id = '11111111-0000-4000-a000-000000000001';
reset role;
select pg_temp.check((select count(*) from public.submission_authors where submission_id = '11111111-0000-4000-a000-000000000001') = 1,
  'authors cannot edit co-authors after submission');

-- Book Review Editor: book-review submissions only
select pg_temp.as_user('00000000-0000-4000-a000-00000000000f');
select pg_temp.check((select count(*) from public.submissions where type <> 'book_review') = 0, 'book review editor cannot see research submissions');
reset role;

-- Payments are server-only
select pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
do $$ begin
  insert into public.payments (reference, submission_id, author_id, fee_type, amount_kobo, status)
  values ('JHTS-RF-X', '11111111-0000-4000-a000-000000000001', '00000000-0000-4000-a000-00000000000a', 'review', 500000, 'success');
  raise exception 'FAILED: author wrote a payment';
exception when insufficient_privilege then raise notice 'ok - authors cannot write payments';
end $$;
reset role;

-- The last Super Admin cannot be demoted. Other Super Admins (e.g. from E2E
-- runs) are demoted first, inside this rolled-back transaction.
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
update public.profiles set role = 'editor' where role = 'super_admin' and id <> '00000000-0000-4000-a000-00000000000e';
select pg_temp.as_user('00000000-0000-4000-a000-00000000000e');
do $$ begin
  update public.profiles set role = 'editor' where role = 'super_admin';
  raise exception 'FAILED: last super admin demoted';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
  raise notice 'ok - last super admin is protected';
end $$;
reset role;

-- Editorial workflow (milestone 6)
insert into public.articles (id, type, title, slug, status, body_html) values
  ('22222222-0000-4000-a000-000000000001', 'research_article', 'Research', 'rls-research', 'draft', '<p>x</p>'),
  ('22222222-0000-4000-a000-000000000002', 'book_review', 'Review', 'rls-book-review', 'draft', '<p>x</p>');

select pg_temp.as_user('00000000-0000-4000-a000-00000000000f');
do $$ begin
  perform public.publish_article('22222222-0000-4000-a000-000000000001');
  raise exception 'FAILED: book review editor published a research article';
exception when insufficient_privilege then raise notice 'ok - book review editor cannot publish research articles';
end $$;
select pg_temp.check((public.publish_article('22222222-0000-4000-a000-000000000002')).status = 'in_press',
  'book review editor publishes a book review as In Press');
reset role;

select pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
do $$ begin
  perform public.reorder_rows('categories', array[]::uuid[]);
  raise exception 'FAILED: author reordered categories';
exception when insufficient_privilege then raise notice 'ok - authors cannot reorder lists';
end $$;
do $$ begin
  perform public.create_next_issue();
  raise exception 'FAILED: author created an issue';
exception when insufficient_privilege then raise notice 'ok - authors cannot create issues';
end $$;
insert into public.saved_filters (scope, name, query) values ('submissions', 'Mine', 'status=submitted');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-00000000000d');
select pg_temp.check((select count(*) from public.saved_filters) = 0, 'saved filters are private to their owner');
-- An editor's issue: publishing it publishes its assigned In Press article
select pg_temp.check((select public.create_next_issue(2031)).status = 'draft', 'editors create the next issue as a draft');
update public.articles set issue_id = (select i.id from public.issues i join public.volumes v on v.id = i.volume_id where v.year = 2031)
 where id = '22222222-0000-4000-a000-000000000002';
select pg_temp.check((select status from public.articles where id = '22222222-0000-4000-a000-000000000002') = 'in_press',
  'an In Press article can wait for a forthcoming issue');
select public.publish_issue((select i.id from public.issues i join public.volumes v on v.id = i.volume_id where v.year = 2031));
select pg_temp.check((select status from public.articles where id = '22222222-0000-4000-a000-000000000002') = 'published',
  'publishing the issue publishes its articles');
reset role;

-- Optimistic locking counts editors' changes only (not counters or the search index)
insert into public.article_authors (article_id, position, name) values ('22222222-0000-4000-a000-000000000001', 1, 'A. Writer');
select pg_temp.check((select version from public.articles where id = '22222222-0000-4000-a000-000000000001') = 1,
  'saving authors does not bump the article version');
update public.articles set title = 'Research, revised' where id = '22222222-0000-4000-a000-000000000001';
select pg_temp.check((select version from public.articles where id = '22222222-0000-4000-a000-000000000001') = 2,
  'editing the article bumps its version');

-- Finance (milestone 7)
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-a000-000000000010', 'finance@example.test', '{"jhts_role":"finance_officer"}', '{"full_name":"Finance F"}');
insert into public.payments (id, reference, submission_id, author_id, fee_type, amount_kobo, status, paid_at)
values ('44444444-0000-4000-a000-000000000001', 'JHTS-RF-TEST-1', '11111111-0000-4000-a000-000000000001',
        '00000000-0000-4000-a000-00000000000a', 'review', 500000, 'success', now());

select pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
select pg_temp.check((select count(*) from public.payment_ledger) = 0, 'authors cannot read the payments ledger');
reset role;

select pg_temp.as_user('00000000-0000-4000-a000-00000000000d');
select pg_temp.check((select count(*) from public.payment_ledger where reference = 'JHTS-RF-TEST-1') = 1, 'editors can view the ledger');
do $$ begin
  insert into public.refunds (payment_id, amount_kobo, reason, refunded_on, recorded_by)
  values ('44444444-0000-4000-a000-000000000001', 100, 'x', current_date, '00000000-0000-4000-a000-00000000000d');
  raise exception 'FAILED: editor recorded a refund';
exception when insufficient_privilege then raise notice 'ok - editors cannot record refunds';
end $$;
reset role;

select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
insert into public.refunds (payment_id, amount_kobo, reason, refunded_on, recorded_by)
values ('44444444-0000-4000-a000-000000000001', 200000, 'Duplicate charge', current_date, '00000000-0000-4000-a000-000000000010');
select pg_temp.check((select status from public.payments where id = '44444444-0000-4000-a000-000000000001') = 'success',
  'a partial refund keeps the payment paid');
do $$ begin
  insert into public.refunds (payment_id, amount_kobo, reason, refunded_on, recorded_by)
  values ('44444444-0000-4000-a000-000000000001', 400000, 'Too much', current_date, '00000000-0000-4000-a000-000000000010');
  raise exception 'FAILED: refunds exceeded the payment';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
  raise notice 'ok - refunds cannot exceed the amount paid';
end $$;
insert into public.refunds (payment_id, amount_kobo, reason, refunded_on, recorded_by)
values ('44444444-0000-4000-a000-000000000001', 300000, 'Rest of it', current_date, '00000000-0000-4000-a000-000000000010');
select pg_temp.check((select status from public.payments where id = '44444444-0000-4000-a000-000000000001') = 'refunded',
  'the finance officer records refunds; a full refund marks the payment refunded');
select pg_temp.check((select net_kobo from public.payment_ledger where reference = 'JHTS-RF-TEST-1') = 0, 'the ledger nets refunds');
reset role;

-- Live notifications (milestone 9)
select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
insert into public.contact_messages (name, email, subject, message) values ('N', 'n@example.test', 'RLS notify', 'Hello editors.');
update public.payments set status = 'failed' where id = '44444444-0000-4000-a000-000000000001';
select pg_temp.as_user('00000000-0000-4000-a000-00000000000d');
select pg_temp.check(exists (select 1 from public.staff_notifications where body = 'RLS notify'), 'editors are notified of contact messages');
select pg_temp.check(not exists (select 1 from public.staff_notifications where kind = 'payment' and body = 'JHTS-RF-TEST-1'),
  'editors do not get payment notifications');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-000000000010');
select pg_temp.check(exists (select 1 from public.staff_notifications where kind = 'payment' and body = 'JHTS-RF-TEST-1'),
  'a failed payment notifies the finance officer');
reset role;
select pg_temp.as_user('00000000-0000-4000-a000-00000000000a');
select pg_temp.check((select count(*) from public.staff_notifications) = 0, 'authors see no staff notifications');
reset role;

rollback;
