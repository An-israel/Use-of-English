drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.profiles cascade;
drop function if exists public.ensure_super_admin_remains(), public.guard_profile_update(), public.is_editorial(),
  public.has_role(variadic public.app_role[]), public.current_role_name(), public.handle_new_user(),
  public.bump_version(), public.touch_updated_at();
drop type if exists public.review_recommendation, public.review_status, public.board_group, public.payment_status,
  public.fee_type, public.submission_status, public.issue_status, public.publish_status, public.citation_style,
  public.article_type, public.app_role;
