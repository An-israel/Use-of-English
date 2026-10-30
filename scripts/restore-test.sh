#!/usr/bin/env bash
# Restore drill (item 84, "test a restore"), LOCAL STACK ONLY. It:
#   1. counts rows in the key tables,
#   2. takes a backup with scripts/backup.sh,
#   3. rebuilds the database from the migrations alone (supabase db reset --no-seed),
#   4. loads the backup's data and compares every count.
# The local database ends up exactly as it started. Never point this at production.
set -euo pipefail
DB="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
case "$DB" in *127.0.0.1*|*localhost*) ;; *) echo "Refusing: the restore drill only runs against a local database." >&2; exit 1 ;; esac
export DATABASE_URL="$DB" OUT="${OUT:-$(mktemp -d)}"
TABLES="auth.users public.profiles public.volumes public.issues public.articles public.article_authors public.submissions public.submission_files public.payments public.refunds public.pages public.page_versions public.editorial_board_members public.site_settings public.feature_flags public.audit_log storage.objects"
mkdir -p "$OUT"
count() { for t in $TABLES; do printf '%s %s\n' "$t" "$(psql "$DB" -At -c "select count(*) from $t")"; done; }

count > "$OUT/before.txt"
unset BACKUP_PASSPHRASE
scripts/backup.sh >/dev/null
echo "Backup written to $OUT ($(du -h "$OUT/data.sql.gz" | cut -f1) of data)."

npx supabase db reset --local --no-seed >/dev/null
( echo "SET session_replication_role = replica;"; gunzip -c "$OUT/data.sql.gz" ) | psql "$DB" -v ON_ERROR_STOP=1 -q >/dev/null
count > "$OUT/after.txt"

if diff -u "$OUT/before.txt" "$OUT/after.txt"; then
  echo "Restore drill passed: every table has the same number of rows ($(wc -l < "$OUT/before.txt") tables checked)."
else
  echo "Restore drill FAILED: counts differ (see above)." >&2
  exit 1
fi
