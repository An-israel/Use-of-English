#!/usr/bin/env bash
# Item 55: every migration has a tested reversal. In ONE transaction this runs
# every rollback in reverse order, then every migration again in order, and
# finally rolls the whole thing back, so the database is left untouched.
# Postgres DDL is transactional, so a failure anywhere aborts with the file name.
set -euo pipefail
DB="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
cd "$(dirname "$0")/.."
script=$(mktemp)
{
  echo '\set ON_ERROR_STOP on'
  echo 'begin;'
  for f in $(ls supabase/rollbacks/*.down.sql | sort -r); do echo "\\echo down $(basename "$f")"; echo "\\i $f"; done
  for f in $(ls supabase/migrations/*.sql | sort); do echo "\\echo up   $(basename "$f")"; echo "\\i $f"; done
  echo 'rollback;'
} > "$script"
psql "$DB" -q -f "$script" | tail -n 3
echo "Rollback check passed: $(ls supabase/rollbacks/*.down.sql | wc -l) reversals and $(ls supabase/migrations/*.sql | wc -l) migrations applied cleanly in one transaction."
