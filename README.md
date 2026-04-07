Rocket Sloth Consulting landing page, optimized for Vercel hosting.

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
- `GET/DELETE /api/crm/me` — current session / logout
- `GET/POST/PATCH/DELETE /api/crm/contacts`
- `GET/POST/PATCH/DELETE /api/crm/deals`
- `GET/POST/PATCH/DELETE /api/crm/activities`
- `POST /api/crm/provision` — admin-only tenant bootstrap

All CRM endpoints require `Authorization: Bearer <sessionToken>` except
`login` and `provision`. All data access is automatically scoped to the
authenticated user's tenant.
