drop table if exists public.feature_flags, public.site_settings, public.call_for_papers, public.page_versions,
  public.pages, public.editorial_board_members, public.slug_redirects, public.book_reviews,
  public.article_authors, public.articles, public.categories, public.issues, public.volumes cascade;
drop function if exists public.snapshot_page_version(), public.record_slug_change(), public.book_review_must_be_book_review(),
  public.bump_article_version(), public.increment_article_counter(uuid, text), public.article_authors_search_refresh(),
  public.articles_search_refresh(), public.article_search_document(public.articles);
