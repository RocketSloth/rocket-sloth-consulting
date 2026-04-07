#!/usr/bin/env bash
# Apply the CRM schema to your Supabase Postgres database.
#
# Usage:
#   SUPABASE_DB_URL='postgresql://postgres:password@db.xxx.supabase.co:5432/postgres' \
#   ./scripts/apply-schema.sh
#
# Get SUPABASE_DB_URL from Supabase → Project Settings → Database → Connection string → URI.

set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/../supabase/crm-schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Schema file not found: $SCHEMA_FILE" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not installed. Either install it, or paste $SCHEMA_FILE into the Supabase SQL editor." >&2
  exit 1
fi

echo "Applying $SCHEMA_FILE to Supabase…"
psql "$SUPABASE_DB_URL" -f "$SCHEMA_FILE"
echo "✓ Schema applied."
