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
