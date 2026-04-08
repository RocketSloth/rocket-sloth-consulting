RocketSloth.Space — AI &amp; BI consulting site, with a built-in multi-tenant
CRM platform that doubles as both the live demo on the landing page and the
product we sell to customers.

Vercel setup:
- Static pages: `index.html` and `thank-you.html`
- Signup endpoint: `api/signup.js`
- Project config: `vercel.json`

Required environment variables in Vercel:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional environment variables:
- `SUPABASE_SIGNUPS_TABLE`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEADS_TO_EMAIL`
- `SIGNUP_WEBHOOK_URL`
- `DEMO_LOGIN_TENANT`

The API always stores signups in Supabase first.

If `SIGNUP_WEBHOOK_URL` is set, the API also posts signup data there.
If the Resend variables are set, the API also emails the lead details.

Create a Supabase table with `supabase/schema.sql`.

## CRM Platform

A multi-tenant CRM lives under `/crm` and `/api/crm/*`. One deployment hosts
many customer CRMs — each customer ("tenant") gets their own login, data, and
config-driven branding/pipeline/custom fields.

### Setup

1. Run `supabase/crm-schema.sql` in your Supabase project.
2. Set `CRM_ADMIN_TOKEN` in Vercel env vars (random secret you keep private).
3. Provision a new customer CRM:

   ```bash
   curl -X POST https://your-domain/api/crm/provision \
     -H "Authorization: Bearer $CRM_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d @crm/config/tenant.example.json-with-creds
   ```

   Body fields: `slug`, `name`, `ownerEmail`, `ownerPassword`, `ownerName`,
   `plan`, `config` (see `crm/config/tenant.example.json`).

4. Send the customer to `https://your-domain/crm/login?tenant=<slug>`.

### Per-customer customization

Everything a customer sees is driven by the `config` JSON stored on their
`crm_tenants` row. You can edit it in Supabase or via the provision endpoint.
Fields:

- `branding.productName` — title + header brand
- `branding.accentColor` — primary color used throughout the UI
- `branding.logoUrl` — optional logo shown in the header
- `pipeline.stages` — array of deal pipeline stages shown on the board
- `contactStatuses` — statuses allowed on contacts
- `customFields.contact` / `customFields.deal` — extra fields stored in JSONB

### CRM API endpoints

- `POST /api/crm/login` — tenant + email + password → session token
- `POST /api/crm/demo-view` — email-only instant demo session bootstrap
- `GET/DELETE /api/crm/me` — current session / logout
- `GET/POST/PATCH/DELETE /api/crm/contacts`
- `GET/POST/PATCH/DELETE /api/crm/deals`
- `GET/POST/PATCH/DELETE /api/crm/activities`
- `POST /api/crm/provision` — admin-only tenant bootstrap
- `POST /api/crm/ai-summary?deal_id=<uuid>` — Claude-powered deal summary, next actions, risk score

All CRM endpoints require `Authorization: Bearer <sessionToken>` except
`login` and `provision`. All data access is automatically scoped to the
authenticated user's tenant.

### AI features

The deal modal includes a **"✨ Summarize with AI"** button that calls
`/api/crm/ai-summary`. This loads the deal + linked contact + recent activities
and asks Claude for a 2-3 sentence status, three concrete next actions, and a
0-100 risk score.

Set `ANTHROPIC_API_KEY` in Vercel env vars to enable live Claude responses.
Without the key the endpoint returns a deterministic stub so the demo still
works without leaking errors.

### Live demo tenant

The landing page CTA "See a live demo →" links to `/#demo-access`.
The instant demo-access flow (`POST /api/crm/demo-view`) also auto-populates
the demo tenant with pool-service sample contacts/deals/activities on first use.
To populate it, run:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
CRM_ADMIN_TOKEN=... \
CRM_BASE_URL=https://rocketsloth.space \
node scripts/seed-demo.js
```

This creates (or refreshes) tenant slug `demo` with branded config, ~30 sample
contacts, ~15 deals across all pipeline stages, and a few activities per deal.

### Helper scripts

- `scripts/apply-schema.sh` — pipes `supabase/crm-schema.sql` into Postgres via `psql`. Needs `SUPABASE_DB_URL`.
- `scripts/provision-tenant.sh` — one-line provisioning of a new customer tenant. Needs `CRM_BASE_URL` and `CRM_ADMIN_TOKEN`.
- `scripts/seed-demo.js` — populates the public `demo` tenant with sample data.

### Going live checklist

1. `psql` or paste `supabase/crm-schema.sql` into Supabase SQL editor.
2. In Vercel env vars, add `CRM_ADMIN_TOKEN` (random 32-byte hex) and `ANTHROPIC_API_KEY`.
3. Redeploy.
4. Run `node scripts/seed-demo.js` to populate the demo tenant.
5. Submit the demo access form on the homepage and verify you land in `/crm` with seeded demo data and working AI summary button.
6. Use `scripts/provision-tenant.sh` to onboard each real customer.
