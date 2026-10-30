drop trigger if exists submissions_status_history on public.submissions;
do $$ declare t text; begin
  foreach t in array array['profiles','volumes','issues','categories','articles','book_reviews','editorial_board_members','pages','call_for_papers','site_settings','feature_flags','submissions','review_assignments','payments','refunds'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
  end loop;
end $$;
drop table if exists public.pending_uploads, public.file_versions, public.contact_messages, public.cron_leases,
  public.rate_limit_buckets, public.metrics_daily, public.metrics_events, public.audit_log,
  public.dead_letter_jobs, public.jobs, public.domain_events cascade;
drop function if exists public.health_check(), public.schema_version(), public.contact_received_event(),
  public.release_lease(text, text, text, text), public.acquire_lease(text, text, int), public.rate_limit_hit(text, int, int),
  public.rollup_metrics(date), public.record_metric(text, uuid, uuid, text, text, text), public.ensure_metrics_partition(date),
  public.audit_row_change(), public.retry_dead_letter(bigint), public.fail_job(bigint, text), public.complete_job(bigint),
  public.claim_jobs(text, int, text), public.enqueue_domain_event();
