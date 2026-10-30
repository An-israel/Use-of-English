-- JHTS · 0200 · Published content: volumes, issues, categories, articles,
-- book reviews, editorial board, pages and policies, call for papers, settings.
-- Reversal: supabase/rollbacks/20261030000200_content.down.sql

-- ---------------------------------------------------------------------------
-- Volumes and issues: Year → Volume → Issue → Articles
-- ---------------------------------------------------------------------------

create table public.volumes (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number > 0),
  year int not null check (year between 2026 and 2200),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger volumes_touch before update on public.volumes
  for each row execute function public.touch_updated_at();

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  volume_id uuid not null references public.volumes (id) on delete restrict,
  number int not null check (number > 0),
  month int not null check (month between 1 and 12),
  title text,
  editorial text,
  -- null means "use the generated cover"
  cover_path text,
  full_pdf_path text,
  full_docx_path text,
  status public.issue_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  is_sample boolean not null default false,
  version int not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (volume_id, number)
);

create index issues_volume_idx on public.issues (volume_id);
create index issues_status_published_idx on public.issues (status, published_at desc) where deleted_at is null;

create trigger issues_touch before update on public.issues
  for each row execute function public.touch_updated_at();
create trigger issues_version before update on public.issues
  for each row execute function public.bump_version();

-- ---------------------------------------------------------------------------
-- Categories (subject areas)
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null default '',
  description text not null default '',
  -- a CSS colour token, e.g. "--thread-language" or a hex value
  thread_color text not null,
  sort_order int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Articles
-- ---------------------------------------------------------------------------

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  -- null while the article is "in press"
  issue_id uuid references public.issues (id) on delete restrict,
  category_id uuid references public.categories (id) on delete restrict,
  type public.article_type not null,
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  abstract text not null default '',
  keywords text[] not null default '{}',
  -- sanitised HTML; sanitised again on render
  body_html text,
  first_page int check (first_page > 0),
  last_page int check (last_page >= first_page),
  doi text unique,
  citation_style public.citation_style,
  licence text not null default 'CC BY 4.0',
  pdf_path text,
  docx_path text,
  received_at date,
  accepted_at date,
  online_at timestamptz,
  published_at timestamptz,
  scheduled_for timestamptz,
  status public.publish_status not null default 'draft',
  sort_order int not null default 0,
  view_count bigint not null default 0,
  download_count bigint not null default 0,
  search_vector tsvector,
  submission_id uuid,
  is_sample boolean not null default false,
  version int not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_in_press_has_no_issue check (status <> 'in_press' or issue_id is null)
);

create index articles_issue_idx on public.articles (issue_id, sort_order) where deleted_at is null;
create index articles_category_idx on public.articles (category_id) where deleted_at is null;
create index articles_status_idx on public.articles (status, published_at desc) where deleted_at is null;
create index articles_online_idx on public.articles (online_at desc) where status = 'in_press' and deleted_at is null;
create index articles_search_idx on public.articles using gin (search_vector);
create index articles_title_trgm_idx on public.articles using gin (title extensions.gin_trgm_ops);
create index articles_type_idx on public.articles (type) where deleted_at is null;

create trigger articles_touch before update on public.articles
  for each row execute function public.touch_updated_at();

create table public.article_authors (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  position int not null,
  name text not null,
  affiliation text,
  email extensions.citext,
  email_public boolean not null default false,
  orcid text check (orcid is null or orcid ~ '^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$'),
  is_corresponding boolean not null default false,
  unique (article_id, position) deferrable initially deferred
);

create index article_authors_article_idx on public.article_authors (article_id, position);
create index article_authors_name_trgm_idx on public.article_authors using gin (name extensions.gin_trgm_ops);

-- Weighted full-text search (section 5.8): A title, B keywords and authors, C abstract.
create or replace function public.article_search_document(a public.articles)
returns tsvector
language sql
stable
set search_path = ''
as $$
  select
    setweight(to_tsvector('english', extensions.unaccent(coalesce(a.title, ''))), 'A') ||
    setweight(to_tsvector('english', extensions.unaccent(
      array_to_string(a.keywords, ' ') || ' ' ||
      coalesce((select string_agg(aa.name, ' ') from public.article_authors aa where aa.article_id = a.id), '')
    )), 'B') ||
    setweight(to_tsvector('english', extensions.unaccent(coalesce(a.abstract, ''))), 'C')
$$;

create or replace function public.articles_search_refresh()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_vector := public.article_search_document(new);
  return new;
end;
$$;

create trigger articles_search before insert or update of title, abstract, keywords on public.articles
  for each row execute function public.articles_search_refresh();

create or replace function public.article_authors_search_refresh()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target uuid := coalesce(new.article_id, old.article_id);
begin
  update public.articles a
     set search_vector = public.article_search_document(a)
   where a.id = target;
  return null;
end;
$$;

create trigger article_authors_search after insert or update or delete on public.article_authors
  for each row execute function public.article_authors_search_refresh();

-- Atomic counters (item 39): a single UPDATE, never read-modify-write in the app.
-- Version is untouched so counting never conflicts with an editor's save.
create or replace function public.increment_article_counter(p_article uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_kind = 'view' then
    update public.articles set view_count = view_count + 1 where id = p_article;
  elsif p_kind = 'download' then
    update public.articles set download_count = download_count + 1 where id = p_article;
  else
    raise exception 'unknown counter %', p_kind;
  end if;
end;
$$;

-- Optimistic locking for articles, except counter-only updates: views and
-- downloads must never invalidate an editor's open form.
create or replace function public.bump_article_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.view_count, new.download_count) is distinct from (old.view_count, old.download_count)
     and (to_jsonb(new) - 'view_count' - 'download_count' - 'updated_at' - 'version')
       = (to_jsonb(old) - 'view_count' - 'download_count' - 'updated_at' - 'version') then
    new.updated_at := old.updated_at;
    return new;
  end if;
  new.version := old.version + 1;
  return new;
end;
$$;
create trigger articles_version before update on public.articles
  for each row execute function public.bump_article_version();

-- ---------------------------------------------------------------------------
-- Book reviews (articles of type book_review plus bibliographic details)
-- ---------------------------------------------------------------------------

create table public.book_reviews (
  article_id uuid primary key references public.articles (id) on delete cascade,
  book_title text not null,
  book_author text not null,
  publisher text,
  year int,
  isbn text,
  pages int,
  book_cover_path text
);

create or replace function public.book_review_must_be_book_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select type from public.articles where id = new.article_id) <> 'book_review' then
    raise exception 'book_reviews rows must reference an article of type book_review';
  end if;
  return new;
end;
$$;

create trigger book_reviews_type before insert or update on public.book_reviews
  for each row execute function public.book_review_must_be_book_review();

-- Permanent URLs: old slugs redirect to the current one (section 12).
create table public.slug_redirects (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('article', 'category', 'page')),
  old_slug text not null,
  new_slug text not null,
  created_at timestamptz not null default now(),
  unique (entity, old_slug)
);

create or replace function public.record_slug_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug then
    insert into public.slug_redirects (entity, old_slug, new_slug)
    values (tg_argv[0], old.slug, new.slug)
    on conflict (entity, old_slug) do update set new_slug = excluded.new_slug;
    -- collapse chains so every old slug points straight at the newest one
    update public.slug_redirects set new_slug = new.slug
     where entity = tg_argv[0] and new_slug = old.slug;
  end if;
  return new;
end;
$$;

create trigger articles_slug_history after update of slug on public.articles
  for each row execute function public.record_slug_change('article');
create trigger categories_slug_history after update of slug on public.categories
  for each row execute function public.record_slug_change('category');

-- ---------------------------------------------------------------------------
-- Editorial board
-- ---------------------------------------------------------------------------

create table public.editorial_board_members (
  id uuid primary key default gen_random_uuid(),
  "group" public.board_group not null,
  name text not null,
  title text,
  affiliation text,
  photo_path text,
  orcid text,
  profile_url text,
  term_start date,
  term_end date,
  sort_order int not null default 0,
  version int not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (term_end is null or term_start is null or term_end > term_start)
);

create index board_group_idx on public.editorial_board_members ("group", sort_order) where deleted_at is null;

create trigger board_touch before update on public.editorial_board_members
  for each row execute function public.touch_updated_at();
create trigger board_version before update on public.editorial_board_members
  for each row execute function public.bump_version();

-- ---------------------------------------------------------------------------
-- Pages and policies (one table, `kind` distinguishes them) with versions
-- ---------------------------------------------------------------------------

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('page', 'policy')),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  body_html text not null default '',
  sort_order int not null default 0,
  is_published boolean not null default true,
  version int not null default 1,
  updated_by uuid references public.profiles (id),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slug)
);

create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();
create trigger pages_version before update on public.pages
  for each row execute function public.bump_version();
create trigger pages_slug_history after update of slug on public.pages
  for each row execute function public.record_slug_change('page');

create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  version int not null,
  title text not null,
  body_html text not null,
  saved_by uuid references public.profiles (id),
  saved_at timestamptz not null default now(),
  unique (page_id, version)
);

create index page_versions_page_idx on public.page_versions (page_id, version desc);

create or replace function public.snapshot_page_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.page_versions (page_id, version, title, body_html, saved_by)
  values (old.id, old.version, old.title, old.body_html, old.updated_by)
  on conflict (page_id, version) do nothing;
  return new;
end;
$$;

create trigger pages_snapshot before update of body_html, title on public.pages
  for each row execute function public.snapshot_page_version();

-- ---------------------------------------------------------------------------
-- Call for Papers: one active call at a time
-- ---------------------------------------------------------------------------

create table public.call_for_papers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  target_issue_id uuid references public.issues (id) on delete set null,
  -- shown when no issue row exists yet, e.g. "Vol. 1 No. 1 (March 2027)"
  target_label text not null,
  summary_html text not null default '',
  banner_text text not null default '',
  submission_deadline timestamptz not null,
  review_period text,
  publication_month text,
  is_active boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index call_for_papers_one_active on public.call_for_papers ((true)) where is_active;

create trigger cfp_touch before update on public.call_for_papers
  for each row execute function public.touch_updated_at();
create trigger cfp_version before update on public.call_for_papers
  for each row execute function public.bump_version();

-- ---------------------------------------------------------------------------
-- Site settings and feature flags
-- ---------------------------------------------------------------------------

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  -- public settings are readable by anyone (journal name, ISSN, fee amounts…)
  is_public boolean not null default true,
  description text,
  version int not null default 1,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create trigger settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();
create trigger settings_version before update on public.site_settings
  for each row execute function public.bump_version();

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null default '',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create trigger flags_touch before update on public.feature_flags
  for each row execute function public.touch_updated_at();
