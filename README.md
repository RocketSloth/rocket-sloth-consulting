Rocket Sloth Consulting landing page, optimized for Vercel hosting.

Vercel setup:
- Static pages: `index.html` and `thank-you.html`
- Signup endpoint: `api/signup.js`
- Project config: `vercel.json`

Set these environment variables in Vercel:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `LEADS_TO_EMAIL`

Optional alternative:
- `SIGNUP_WEBHOOK_URL`

If `SIGNUP_WEBHOOK_URL` is set, the API posts signup data there.
Otherwise it sends email through Resend.
