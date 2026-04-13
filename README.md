RocketSloth.Space is an AI and BI consulting site with a built-in multi-tenant
CRM platform. That CRM doubles as both the public product demo and the base
application that gets customized for clients.

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

The signup API always stores leads in Supabase first.

If `SIGNUP_WEBHOOK_URL` is set, the API also posts signup data there.
If the Resend variables are set, the API also emails the lead details.

Create a Supabase table with `supabase/schema.sql`.

## CRM Platform

A multi-tenant CRM lives under `/crm` and `/api/crm/*`. One deployment hosts
many client CRMs, and each tenant gets its own login, data, branding, pipeline,
and custom fields.

### Setup

1. Run `supabase/crm-schema.sql` in your Supabase project.
2. Set `CRM_ADMIN_TOKEN` in Vercel env vars.
3. Provision a new client CRM:

   ```bash
   curl -X POST https://your-domain/api/crm/provision \
     -H "Authorization: Bearer $CRM_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d @crm/config/tenant.example.json-with-creds
   ```

   Body fields: `slug`, `name`, `ownerEmail`, `ownerPassword`, `ownerName`,
   `plan`, and `config` (see `crm/config/tenant.example.json`).

4. Send the client to `https://your-domain/crm/login?tenant=<slug>`.

### Per-client customization

Everything a client sees is driven by the `config` JSON stored on its
`crm_tenants` row. You can edit it in Supabase or via the provision endpoint.

Fields:
- `branding.productName` for the title and header brand
- `branding.accentColor` for the primary UI accent
- `branding.logoUrl` for an optional logo
- `pipeline.stages` for the kanban board columns
- `contactStatuses` for allowed contact states
- `customFields.contact` and `customFields.deal` for extra JSON fields

### Magic-link login (passwordless)

The default login flow is passwordless:

1. Customer visits `rocketsloth.space/crm/t/acme` (tenant slug in URL, no
   typing).
2. They enter only their email address and click "Send sign-in link."
3. Resend delivers an email with a one-click sign-in link (30 min expiry).
4. Clicking the link lands on `/crm/auth?token=...` which exchanges the token
   for a session and redirects to the CRM.

If `RESEND_API_KEY` + `RESEND_FROM_EMAIL` are not set, the endpoint returns the
link directly in the JSON response for dev/testing.

Password login is still available behind a "Use password instead" toggle for
admin use.

### CRM API endpoints

- `POST /api/crm/magic-link` — request a magic login link (tenant + email)
- `POST /api/crm/magic-verify` — exchange a magic token for a session
- `POST /api/crm/login` — tenant + email + password → session token (admin fallback)
- `GET/DELETE /api/crm/me` — current session / logout
- `GET/POST/PATCH/DELETE /api/crm/contacts`
- `GET/POST/PATCH/DELETE /api/crm/deals`
- `GET/POST/PATCH/DELETE /api/crm/activities`
- `POST /api/crm/provision` for admin-only tenant bootstrap
- `POST /api/crm/ai-summary?deal_id=<uuid>` for AI deal status and next actions

All CRM endpoints require `Authorization: Bearer <sessionToken>` except
`login`, `magic-link`, `magic-verify`, and `provision`. All data access is
automatically scoped to the authenticated user's tenant.

### AI features

The deal modal includes a "Summarize with AI" button that calls
`/api/crm/ai-summary`. This loads the deal, linked contact, and recent
activities and asks Claude for:
- a 2-3 sentence status summary
- three concrete next actions
- a 0-100 risk score

Set `ANTHROPIC_API_KEY` in Vercel env vars to enable live Claude responses.
Without the key the endpoint returns a deterministic stub so the demo still
works cleanly.

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

- `scripts/apply-schema.sh` pipes `supabase/crm-schema.sql` into Postgres via `psql`. Needs `SUPABASE_DB_URL`.
- `scripts/provision-tenant.sh` provisions a new tenant. Needs `CRM_BASE_URL` and `CRM_ADMIN_TOKEN`.
- `scripts/seed-demo.js` populates the public `demo` tenant with sample data.

### Going live checklist

1. Run `supabase/crm-schema.sql` in Supabase.
2. Add `CRM_ADMIN_TOKEN` and `ANTHROPIC_API_KEY` to Vercel env vars.
3. Redeploy.
4. Run `node scripts/seed-demo.js` to populate the demo tenant.
5. Submit the demo access form on the homepage and verify you land in `/crm` with seeded demo data and working AI summary button.
6. Use `scripts/provision-tenant.sh` to onboard each real customer.
