# RocketSloth.Space — Vetted home & trade services directory

An Angie's List–style directory for local home & trade pros. Businesses **apply and
are vetted** before they're listed, and homeowners leave **evidence-backed reviews** —
every review requires a receipt/invoice plus before & after photos and is verified by an
admin before it publishes.

Built with **Next.js (App Router) + TypeScript + Tailwind CSS** and **Supabase**
(Postgres + Auth + Storage), deployed on **Vercel**.

## How it works

- **Homeowners** browse vetted companies by category and location, read verified
  reviews, and leave their own — but only with proof of the work.
- **Businesses** apply with their details, categories, service area, and license; an
  admin reviews each application before it goes public with a "vetted" badge.
- **Admins** work two queues in `/admin`: pending applications and pending reviews
  (with the evidence to verify).

### The two trust rules

1. **Vetting** — a company is `pending` until an admin approves it. Only `approved`
   companies appear publicly.
2. **Evidence** — a review is `pending` until an admin verifies its evidence. Only
   `published` reviews are visible and counted toward a company's rating. Receipts stay
   private; before/after photos may appear on the published review.

## Project structure

```
app/
  page.tsx                 home (hero search, categories, top-rated, how-it-works)
  companies/               /companies (browse+filter), /companies/[slug] (profile, SSR)
  categories/              /categories (index), /categories/[slug] (landing)
  for-businesses/          marketing + apply CTA
  how-it-works/            vetting + evidence policy
  apply/                   company application (page + form + server action)
  reviews/new/             write-a-review (page + form + server action)
  account/                 customer/owner dashboard
  admin/                   vetting dashboard (page + server actions)
  auth/                    sign-in, sign-up, callback, sign-out action
components/                Header, Footer, CompanyCard, RatingStars, EvidenceUploader, …
lib/                       supabase clients, auth, queries, admin-queries, types, format
supabase/migrations/       0001_init.sql  (tables, RLS, triggers, storage buckets)
supabase/seed.sql          categories + sample approved companies + published reviews
middleware.ts              Supabase auth session refresh
```

## Local setup

1. Install deps:

   ```bash
   npm install
   ```

2. Create a Supabase project, then copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...        # server-only; powers the admin queues
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Apply the schema and seed in the Supabase SQL editor (or CLI), in order:
   `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.

4. Run it:

   ```bash
   npm run dev
   ```

> The site builds and renders without Supabase configured (categories fall back to a
> built-in list, and DB-backed sections show empty states). Auth, applications, reviews,
> and the admin dashboard require the env vars above.

## Roles & the first admin

Sign-up creates a `customer` or `company_owner` profile (never `admin`). Two ways
to get an admin:

- **Allowlist (recommended):** add the email to `admin_emails` and that user is made
  an admin automatically on signup:
  ```sql
  insert into public.admin_emails (email) values ('you@example.com') on conflict do nothing;
  ```
- **Promote an existing user:**
  ```sql
  update public.profiles set role = 'admin' where email = 'you@example.com';
  ```

For frictionless local testing, disable email confirmation in
**Supabase → Authentication → Providers → Email** (otherwise sign-up sends a
confirmation link, which is handled by `/auth/callback`).

## Data model

`profiles` · `categories` · `companies` (+ `company_categories`) ·
`company_applications` · `reviews` · `review_evidence`. Row-Level Security enforces the
trust rules (public reads only `approved` companies / `published` reviews; owners and
authors manage their own rows; only admins flip statuses). A trigger keeps each
company's `rating_avg` / `rating_count` in sync from published reviews. Storage buckets:
`review-photos` (public), `review-receipts` (private), `applications` (private),
`company-media` (public).

## Deploying

Push to Vercel and set the same env vars in the project settings. No `vercel.json` is
needed — Vercel auto-detects Next.js. Security headers are configured in
`next.config.mjs`.

## Roadmap (not yet built)

Paid/featured listings (Stripe), quote-request messaging, email notifications,
map/geo-radius search, company replies to reviews, public reporting/moderation, and a
"claim your business" flow.
