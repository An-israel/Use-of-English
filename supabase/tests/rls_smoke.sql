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

-- The last Super Admin cannot be demoted (seeded DB may have none besides ours)
select pg_temp.as_user('00000000-0000-4000-a000-00000000000e');
do $$ begin
  update public.profiles set role = 'editor' where role = 'super_admin';
  raise exception 'FAILED: last super admin demoted';
exception when raise_exception then
  if sqlerrm like 'FAILED%' then raise; end if;
  raise notice 'ok - last super admin is protected';
end $$;
reset role;

rollback;
