# CLAUDE.md — VettedPages project state

Read this first: it captures where the project stands and how we work, so a new
session can continue without re-deriving anything.

## What this is

**VettedPages** (www.VettedPages.com) — an Angie's List–style directory of local
businesses. Two trust rules: (1) businesses **apply and are vetted** before listing;
(2) reviews are **verified** before they publish/count (original concept: require a
receipt/invoice + before & after photos — the owner is currently **rethinking the
evidence mechanic**, so landing copy was softened to "verified reviews"; the full
evidence system is still built in the code, unchanged).

Formerly RocketSloth.Space (AI consulting site + CRM) — fully replaced and rebranded.

## Current mode: PRE-LAUNCH (waitlist only)

- `NEXT_PUBLIC_SITE_LAUNCHED` unset/false → `middleware.ts` redirects everything
  except `/`, `/auth/*`, `/admin/*` to `/`. Header/footer hide public nav.
- The public sees only the landing page: customer signup (email + ZIP, required) and
  business "request early access" form.
- Signups land in `waitlist_signups` (public insert, admin-only read). Owner watches
  them in `/admin` and will export CSV from Supabase to email the list (no email
  sending built — deliberate, "leave it to the Supabase export for now").
- Go-live = set `NEXT_PUBLIC_SITE_LAUNCHED=true` in Vercel and redeploy (opens the
  full directory, /apply, reviews).

## Stack & layout

Next.js 15 App Router + TypeScript + Tailwind, Supabase (Postgres/Auth/Storage),
Vercel. Key paths: `app/` routes (+ server actions in `app/**/actions.ts`),
`components/`, `lib/` (env, types, constants, supabase clients, queries,
admin-queries), `supabase/migrations/0001..0007` + `seed.sql`. Brand: evergreen/PNW
palette, shield-check logo, wordmark **Vetted**Pages (two-tone).

## Live infrastructure

- **Supabase project:** `slocfkpnvizlxhsdcbhe` ("RocketSloth's Project"),
  https://slocfkpnvizlxhsdcbhe.supabase.co — ALL migrations 0001–0007 are applied
  live (via Supabase MCP), seed loaded (14 approved companies incl. 8 Frisco TX, 22
  published reviews). Legacy `crm_*` tables dropped. RLS on everywhere.
- **Admin allowlist:** `admin_emails` contains `kbbb2003@gmail.com` (owner). Signup
  with that email auto-grants role `admin`. Owner had NOT yet created the account.
- **Vercel:** team `rocketsloths-projects`, project `rocket-sloth-consulting`
  (`prj_SVvCHPOYc24QjuRvuChmaLpCkRta`). Production deploys from `main`. Domains
  still rocketsloth.space + vercel.app; **vettedpages.com not yet added**.
- Env vars set by owner in Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (code accepts this name or legacy
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`.
  `NEXT_PUBLIC_SITE_URL` should be set to https://www.vettedpages.com (pending).
- **Gotcha:** `NEXT_PUBLIC_*` is baked at build time — env changes need a redeploy.

## Workflow (important)

- Develop on branch `claude/pensive-tesla-ht3h38`, push, open **draft PR** to `main`.
  The owner merges via GitHub UI (PRs #33–#38 merged so far), Vercel auto-deploys
  `main` to production.
- DB changes: write a numbered file in `supabase/migrations/` AND apply live via
  Supabase MCP (`apply_migration`), then verify with `execute_sql`.
- Verify changes end-to-end where possible (RLS tested by `set local role anon /
  authenticated / service_role` + `request.jwt.claims`).

## Hard-won fixes (do not regress)

1. **Waitlist insert fails under anon**: PostgREST returns the inserted row, which
   needs SELECT — but the list is admin-only. Fix: `joinWaitlist` writes with the
   **service-role client** (server action only), plain insert, duplicate (23505) =
   success. (`app/waitlist/actions.ts`)
2. **Guard triggers vs service role**: `protect_company_fields` /
   `protect_review_fields` must only revert fields when request role is
   anon/authenticated non-admin — otherwise admin (service-role) approvals silently
   revert. (migration 0004)
3. **Rating rollup** uses a transaction-local GUC bypass (`app.bypass_company_guard`)
   so review deletes/publishes update `rating_avg`/`rating_count`. (0001 + 0004)
4. Vercel needed `vercel.json` `{"framework":"nextjs"}` (old project settings
   expected a static site).

## Open PR / pending merge

**PR #39** (draft) on branch `claude/pensive-tesla-ht3h38` contains, not yet in main:
waitlist RLS fix, VettedPages rebrand, business website field + "no website yet"
checkbox, evidence band removed from landing, evidence copy softened. Owner must
**merge + redeploy** for these to go live.

## IN PROGRESS (interrupted mid-task)

Owner request: business-type dropdown must cover **all** business types
(Photography, Cleaning, Fitness, etc.), and the business early-access form must
require **every field** filled to join the waitlist.

- DONE: `BUSINESS_TYPE_GROUPS` (grouped, comprehensive list incl. "Other") added to
  `lib/constants.ts`.
- TODO: use it in `components/WaitlistForms.tsx` BusinessSignupForm as a grouped
  `<select>` (replacing the directory-category dropdown); make all business fields
  required (name, business name, email, phone, city, ZIP, category; website required
  unless "I don't have a website yet" checked — keep that checkbox); enforce the
  same server-side in `app/waitlist/actions.ts`; keep customer form email+ZIP
  required. Then build, commit, push (PR #39).

## Owner's remaining manual steps (Vercel/DNS/Supabase dashboards)

1. Merge PR #39, redeploy `main`.
2. Add domains `www.vettedpages.com` + `vettedpages.com` in Vercel, point DNS.
3. Set `NEXT_PUBLIC_SITE_URL=https://www.vettedpages.com`, redeploy.
4. Supabase Auth → URL config: site URL + redirect `https://www.vettedpages.com/auth/callback`.
5. Sign up with kbbb2003@gmail.com → auto-admin → `/admin` shows waitlist.

## Roadmap (explicitly deferred)

Email broadcasts to the waitlist (Resend), Stripe paid listings, quote-request
messaging, geo/map search, company replies to reviews, claim-your-business, and the
rethought review-evidence mechanic. Site launch when the owner has "enough people
and businesses."
