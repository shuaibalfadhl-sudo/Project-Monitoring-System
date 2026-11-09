#!/usr/bin/env bash
# Copies a Supabase project database (roles + schema + data) to another project.
#
# Usage (Git Bash):
#   export OLD_DB_URL='postgresql://postgres:<password>@db.<old-ref>.supabase.co:5432/postgres'
#   export NEW_DB_URL='postgresql://postgres:<password>@db.<new-ref>.supabase.co:5432/postgres'
#   ./scripts/migrate-db.sh
#
# Requires: Docker running, supabase CLI, psql.
# Does not migrate auth users or storage files.

set -euo pipefail

: "${OLD_DB_URL:?Set OLD_DB_URL first}"
: "${NEW_DB_URL:?Set NEW_DB_URL first}"

for bin in supabase psql; do
  command -v "$bin" >/dev/null 2>&1 || { echo "Missing '$bin' on PATH"; exit 1; }
done
docker info >/dev/null 2>&1 || { echo "Docker is not running (supabase db dump needs it)"; exit 1; }

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
cd "$WORKDIR"

echo "==> Checking target project is empty"
tables=$(psql "$NEW_DB_URL" -Atc "select count(*) from information_schema.tables where table_schema = 'public'")
if [ "$tables" != "0" ]; then
  echo "Target already has $tables table(s) in public. Aborting to avoid conflicting restores."
  exit 1
fi

echo "==> Dumping roles"
supabase db dump --db-url "$OLD_DB_URL" -f roles.sql --role-only

echo "==> Dumping schema"
supabase db dump --db-url "$OLD_DB_URL" -f schema.sql

echo "==> Dumping data"
supabase db dump --db-url "$OLD_DB_URL" -f data.sql --use-copy --data-only \
  -x "storage.buckets_vectors" -x "storage.vector_indexes"

echo "==> Restoring roles (existing-role warnings are expected)"
psql "$NEW_DB_URL" -f roles.sql -v ON_ERROR_STOP=0

echo "==> Restoring schema"
psql "$NEW_DB_URL" -f schema.sql -v ON_ERROR_STOP=1

echo "==> Restoring data"
psql "$NEW_DB_URL" -f data.sql -v ON_ERROR_STOP=1

echo "==> Migration finished. Update .env.local with the new project's URL and keys."