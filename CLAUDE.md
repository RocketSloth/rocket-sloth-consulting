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

## PR history / current state

PRs #33–#44 are **merged** (owner merges fast — often within minutes). That covers:
full directory rebuild, admin allowlist + Frisco seed, rebrand to VettedPages,
waitlist + RLS fix, required business fields + `BUSINESS_TYPE_GROUPS`, launch
campaign (LAUNCH_AREA/CATEGORIES, referral loop, admin insights), Vercel Analytics
+ live progress ticker. One open PR at a time on the working branch; when a PR
merges, restart the branch from origin/main (`git checkout -B <branch>
origin/main`) before new work.

Latest polish pass (this PR): site metadata rewritten to campaign positioning
(old meta description still sold the receipt/before-after mechanic — removed),
generated OG share image (`app/opengraph-image.tsx`, next/og ImageResponse —
critical for Nextdoor/FB link previews; use inline SVGs, NOT ✓/emoji glyphs,
satori's default font lacks them), `app/robots.ts` + `app/sitemap.ts` (sitemap
lists only `/` pre-launch), ZIP format validation client (`pattern`) + server
(`ZIP_RE`), and middleware now allows `/robots.txt`, `/sitemap.xml`,
`/opengraph-image` through the pre-launch gate (they previously 307'd to `/`,
which would have broken crawlers and social previews).

## Waitlist form rules (implemented — keep intact)

Business early-access form (`components/WaitlistForms.tsx` BusinessSignupForm):
**every field required** — business name, your name, email, phone, city, ZIP, and
business type from `BUSINESS_TYPE_GROUPS` (grouped `<optgroup>` select covering all
business types: home & trade, automotive, health, beauty, fitness, food, creative/
photography, professional, pets, events, education, retail, "Other"); website
required unless the "I don't have a website yet" checkbox (`no_website`) is checked
(then website saves as null); free-text message stays optional. The same rules are
enforced server-side in `app/waitlist/actions.ts` (returns "Please fill in: …").
Customer form requires email + ZIP (client and server). Business type is stored as
the display string (e.g. "Photography") in `waitlist_signups.category`.

## Launch campaign (implemented on the site)

Owner's strategy: treat this as **local trust infrastructure**, not "another
directory" — "help us build the local list of businesses your neighbors can
actually trust." First milestone: 500 residents + 25 vetted businesses across 5
categories, then monetize. Site-side pieces built:

- **Launch focus**: `LAUNCH_AREA` ("Frisco, Little Elm & the Denton County area")
  and `LAUNCH_CATEGORIES` (Roofing, Plumbing, HVAC, Lawn Care & Landscaping, House
  Cleaning, Handyman) in `lib/constants.ts`. Landing hero, launch-categories grid,
  and business copy ("limited founding businesses per category per area") use them.
- **Resident signup** captures email + ZIP + **"What service do you need most?"**
  (launch categories + "Something else", stored in `waitlist_signups.category`).
  CTA is "Join the local list" (community framing, not "Notify me").
- **Referral loop**: after joining, residents see "Know a business your neighbors
  should trust?" (`RecommendBusinessForm`) → `business_recommendations` table
  (migration 0008; public insert, admin read/update, status workflow
  new→contacted→invited→listed/dismissed). Owner invites these businesses:
  "A local homeowner recommended your business…".
- **Admin growth insights**: resident/business/recommendation counts, **top
  requested services**, **top ZIP codes**, and the recommendations queue — this is
  what decides which ZIPs/categories open first.

Off-site (owner's to-do, not code): Nextdoor community-style posts, FB/Nextdoor
business pages, manual founding-business outreach (~10 per launch category), $10–20/
day Meta lead ads (separate resident + business campaigns), progress-update posts.

Also built: **Vercel Analytics** (`@vercel/analytics`, `<Analytics />` in
`app/layout.tsx` — owner must enable Web Analytics in the Vercel project dashboard)
and a **live progress ticker** in the landing hero ("N neighbors have joined · top
requested: X · N businesses applied") via `getLaunchProgress()` in
`lib/admin-queries.ts` (aggregate counts only; hidden until ≥5 residents,
`TICKER_MIN_RESIDENTS` in `app/page.tsx`).

## Owner's remaining manual steps (Vercel/DNS/Supabase dashboards)

1. Merge the open PR, redeploy `main`.
2. Add domains `www.vettedpages.com` + `vettedpages.com` in Vercel, point DNS.
3. Set `NEXT_PUBLIC_SITE_URL=https://www.vettedpages.com`, redeploy (baked at
   build — canonical/OG URLs say localhost until then).
4. Supabase Auth → URL config: site URL + redirect `https://www.vettedpages.com/auth/callback`.
5. Enable **Web Analytics** in the Vercel project dashboard (Analytics tab) so
   `<Analytics />` starts collecting.
6. Sign up with kbbb2003@gmail.com → auto-admin → `/admin` shows waitlist,
   growth insights, and the recommendations queue.

## Roadmap (explicitly deferred)

Email broadcasts to the waitlist (Resend), Stripe paid listings, quote-request
messaging, geo/map search, company replies to reviews, claim-your-business, and the
rethought review-evidence mechanic. Site launch when the owner has "enough people
and businesses."
