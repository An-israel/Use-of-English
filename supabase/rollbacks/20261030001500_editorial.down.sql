drop view if exists public.reviewer_assignment_detail;
drop trigger if exists review_assignments_events on public.review_assignments;
drop trigger if exists articles_sync_submission on public.articles;
drop function if exists public.review_events(), public.article_from_submission(uuid), public.publish_due(),
  public.sync_submission_on_publish(), public.publish_article(uuid), public.unpublish_issue(uuid),
  public.publish_issue(uuid), public.create_next_issue(int);
