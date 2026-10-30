-- JHTS · 1000 · Keep profiles.role in step with auth app_metadata.jhts_role.
-- Supabase Auth writes custom app_metadata in a second statement after the
-- user row is inserted, so handle_new_user() can miss it. app_metadata is
-- writable only with the service role, so following it is safe.
-- Reversal: supabase/rollbacks/20261030001000_sync_role_from_app_metadata.down.sql

create or replace function public.sync_role_from_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  if new.raw_app_meta_data ? 'jhts_role'
     and (new.raw_app_meta_data ->> 'jhts_role') is distinct from (old.raw_app_meta_data ->> 'jhts_role') then
    v_role := (new.raw_app_meta_data ->> 'jhts_role')::public.app_role;
    update public.profiles set role = v_role where id = new.id and role is distinct from v_role;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_app_metadata
  after update of raw_app_meta_data on auth.users
  for each row execute function public.sync_role_from_app_metadata();
