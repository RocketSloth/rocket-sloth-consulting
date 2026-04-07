#!/usr/bin/env bash
# Provision a new customer CRM tenant.
#
# Usage:
#   CRM_BASE_URL=https://rocketsloth.space \
#   CRM_ADMIN_TOKEN=xxx \
#   ./scripts/provision-tenant.sh <slug> "<Customer Name>" <owner-email> <owner-password> [accent-color]
#
# Example:
#   ./scripts/provision-tenant.sh acme "Acme Inc" owner@acme.com s3cret-pass-123 '#e11d48'

set -euo pipefail

if [ "$#" -lt 4 ]; then
  echo "Usage: $0 <slug> <name> <owner-email> <owner-password> [accent-color]" >&2
  exit 1
fi

: "${CRM_BASE_URL:?Set CRM_BASE_URL (e.g. https://rocketsloth.space)}"
: "${CRM_ADMIN_TOKEN:?Set CRM_ADMIN_TOKEN}"

SLUG="$1"
NAME="$2"
OWNER_EMAIL="$3"
OWNER_PASSWORD="$4"
ACCENT="${5:-#4f46e5}"

read -r -d '' BODY <<JSON || true
{
  "slug": "$SLUG",
  "name": "$NAME",
  "ownerEmail": "$OWNER_EMAIL",
  "ownerPassword": "$OWNER_PASSWORD",
  "ownerName": "$NAME Owner",
  "plan": "starter",
  "config": {
    "branding": { "productName": "$NAME CRM", "accentColor": "$ACCENT" },
    "pipeline": {
      "stages": [
        { "id": "new",         "label": "New Lead",      "probability": 10 },
        { "id": "qualified",   "label": "Qualified",     "probability": 25 },
        { "id": "proposal",    "label": "Proposal",      "probability": 60 },
        { "id": "negotiation", "label": "Negotiation",   "probability": 80 },
        { "id": "won",         "label": "Closed Won",    "probability": 100 },
        { "id": "lost",        "label": "Closed Lost",   "probability": 0 }
      ]
    },
    "contactStatuses": ["lead", "prospect", "customer", "archived"],
    "customFields": { "contact": [], "deal": [] }
  }
}
JSON

curl -fsSL -X POST "$CRM_BASE_URL/api/crm/provision" \
  -H "Authorization: Bearer $CRM_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY"

echo
echo "✓ Tenant '$SLUG' ready. Login: $CRM_BASE_URL/crm/login?tenant=$SLUG"
