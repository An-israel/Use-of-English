#!/usr/bin/env bash
# Weekly off-site backup (item 84). Produces, in $OUT (default ./backup-out):
#   data.sql.gz       data of the public, auth and storage schemas (restore on top
#                     of the migrations in git: see docs/RUNBOOK.md)
#   full.dump         a complete pg_dump (custom format) for forensic use
#   storage.json      every stored file: bucket, path, size, type, updated
# Everything is encrypted with BACKUP_PASSPHRASE (gpg, AES-256) when it is set.
#
# Env: DATABASE_URL (direct or session-pooler connection string), and for the
# manifest NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
# PG_DUMP overrides the pg_dump command (it must match the server's major version).
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
OUT="${OUT:-backup-out}"
PG_DUMP="${PG_DUMP:-pg_dump}"
mkdir -p "$OUT"

# Data only; sessions, tokens, rate-limit counters and migration bookkeeping are
# rebuilt by the platform.
{
  $PG_DUMP "$DATABASE_URL" --data-only --no-owner --no-privileges \
    --schema=public --schema=auth \
    --exclude-table-data='auth.sessions' --exclude-table-data='auth.refresh_tokens' \
    --exclude-table-data='auth.audit_log_entries' --exclude-table-data='auth.flow_state' \
    --exclude-table-data='auth.one_time_tokens' --exclude-table-data='auth.schema_migrations' \
    --exclude-table-data='auth.mfa_challenges' --exclude-table-data='public.rate_limit_buckets'
  # File records only; the buckets come from migration 0700 and Storage owns its other tables.
  $PG_DUMP "$DATABASE_URL" --data-only --no-owner --no-privileges --table=storage.objects
}   | gzip -9 > "$OUT/data.sql.gz"

$PG_DUMP "$DATABASE_URL" --format=custom --no-owner --no-privileges --schema=public --schema=auth --schema=storage \
  > "$OUT/full.dump"

node scripts/storage-manifest.mjs > "$OUT/storage.json"

if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  for f in "$OUT"/data.sql.gz "$OUT"/full.dump "$OUT"/storage.json; do
    gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" \
      --symmetric --cipher-algo AES256 -o "$f.gpg" "$f"
    rm "$f"
  done
fi
ls -l "$OUT"
