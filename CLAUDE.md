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
  except `/`, `/privacy`, `/terms`, `/auth/*`, `/admin/*` (plus robots/sitemap/
  opengraph-image for crawlers) to `/`. Header/footer hide public nav.
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
admin-queries), `supabase/migrations/0001..0009` + `seed.sql`. Brand: evergreen/PNW
palette, shield-check logo, wordmark **Vetted**Pages (two-tone).

## Live infrastructure

- **Supabase project:** `slocfkpnvizlxhsdcbhe` ("RocketSloth's Project"),
  https://slocfkpnvizlxhsdcbhe.supabase.co — ALL migrations 0001–0009 are applied
  live (via Supabase MCP), seed loaded (14 approved companies incl. 8 Frisco TX, 22
  published reviews). RLS on everywhere. Migration 0009 (2026-07-09) dropped the 15
  legacy *unprefixed* CRM tables that 0003 missed (`customers`, `projects`,
  `change_orders`, `signups`, `app_users`, `notifications`, `settings`, …— all were
  empty but had `USING (true)` write policies for any authenticated user) plus the
  legacy helper functions, and revoked anon/authenticated EXECUTE on internal
  trigger functions. Remaining security-advisor warnings are intentional: public
  INSERT on `waitlist_signups`/`business_recommendations` (by design), `is_admin()`
  executable (RLS policies need it), citext in public schema (not worth moving).
  One real one left: **leaked-password protection is off** (owner dashboard toggle).
- **Admin account: LIVE.** Owner signed up 2026-06-30 with `kbbb2003@gmail.com` →
  auto-granted `admin` via the `admin_emails` allowlist. (A second account,
  `bkbwashing@gmail.com`, exists with role `customer`.)
- **Vercel:** team `rocketsloths-projects`, project `rocket-sloth-consulting`
  (`prj_SVvCHPOYc24QjuRvuChmaLpCkRta`). Production deploys from `main`. Domains
  `www.vettedpages.com` + `vettedpages.com` are **added and serving** (old
  rocketsloth.space + vercel.app domains still attached too).
- Env vars set by owner in Vercel: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (code accepts this name or legacy
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`.
- **Gotcha:** `NEXT_PUBLIC_*` is baked at build time — env changes need a redeploy.
  `NEXT_PUBLIC_SITE_URL` is currently **https://rocketsloth.space** (verified on the
  live page: og:url and the OG image URL point at the old domain), so share links
  and canonicals are wrong until the owner sets it to https://www.vettedpages.com
  and redeploys.
- **Traction snapshot (2026-07-09):** 17 waitlist signups (12 residents / 5
  businesses), 1 company application, 0 business recommendations yet.

## Workflow (important)

- Develop on the session's designated `claude/*` branch (this session:
  `claude/site-updates-mcp-notes-89tpdd`; earlier sessions used
  `claude/pensive-tesla-ht3h38`), push, open **draft PR** to `main`. The owner
  merges via GitHub UI (fast — often within minutes), Vercel auto-deploys `main`
  to production.
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
5. **Function grants (0009)**: internal trigger functions have no anon/authenticated
   EXECUTE anymore. If app code ever calls a DB function via `.rpc()`, grant EXECUTE
   to the calling role explicitly. `is_admin()` must stay executable by
   anon/authenticated — RLS policies evaluate it as the querying role.

## PR history / current state

PRs #33–#45 are **merged**. That covers: full directory rebuild, admin allowlist +
Frisco seed, rebrand to VettedPages, waitlist + RLS fix, required business fields +
`BUSINESS_TYPE_GROUPS`, launch campaign (LAUNCH_AREA/CATEGORIES, referral loop,
admin insights), Vercel Analytics + live progress ticker, and the share/SEO polish
pass (campaign metadata, generated OG image via `app/opengraph-image.tsx` — use
inline SVGs, NOT ✓/emoji glyphs, satori's default font lacks them — robots/sitemap,
ZIP validation, pre-launch gate allowances for crawler routes). One open PR at a
time on the working branch; when a PR merges, restart the branch from origin/main
(`git checkout -B <branch> origin/main`) before new work.

This PR (legal pages + DB cleanup + notes refresh):

- **`/privacy` + `/terms` pages** (`app/privacy/page.tsx`, `app/terms/page.tsx`) —
  plain-English, static. Needed because we collect PII, and **Meta lead ads require
  a public privacy-policy URL** (blocks the planned ad campaigns otherwise). Allowed
  through the pre-launch gate in `middleware.ts`, linked from both footer variants,
  listed in `app/sitemap.ts`. The contact line says "reply to any email from
  VettedPages" — swap in a real address (e.g. hello@vettedpages.com) once one exists.
- **Organization + WebSite JSON-LD** in `app/layout.tsx` (uses SITE_URL/LAUNCH_AREA).
- **Migration 0009** — legacy CRM table/function drop + EXECUTE hardening (details
  under Live infrastructure), applied live and verified (triggers intact, anon still
  sees exactly the 14 approved companies, `on_auth_user_created` still present).

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

### Meta Ads via MCP (new option for the ads to-do)

Meta launched official **Ads AI Connectors** in open beta on 2026-04-29: a
first-party hosted MCP server at **https://mcp.facebook.com/ads** (plus a CLI),
~29 tools covering reporting/insights, campaign management, catalog ops, account
diagnostics, and dataset ops. Auth is **Meta Business OAuth** — no developer app or
API tokens. Claude is supported: add it as a connector in claude.ai settings, or in
Claude Code via `claude mcp add --transport http meta-ads https://mcp.facebook.com/ads`.
Everything it creates lands **PAUSED** by default, so review in Ads Manager before
spend starts. This is the sane way to run the planned $10–20/day resident +
business lead campaigns conversationally. Notes: needs a Meta Business
account/Page + ad account; lead ads require a privacy-policy URL — `/privacy`
(this PR) satisfies that. This repo's remote coding environment does NOT have the
Meta MCP connected (only Supabase/Vercel/GitHub/Stripe) — connect it in the
claude.ai app or Claude Desktop where the ads work will happen.

Also built: **Vercel Analytics** (`@vercel/analytics`, `<Analytics />` in
`app/layout.tsx` — owner must enable Web Analytics in the Vercel project dashboard)
and a **live progress ticker** in the landing hero ("N neighbors have joined · top
requested: X · N businesses applied") via `getLaunchProgress()` in
`lib/admin-queries.ts` (aggregate counts only; hidden until ≥5 residents,
`TICKER_MIN_RESIDENTS` in `app/page.tsx`).

## Owner's remaining manual steps (Vercel/Supabase dashboards)

Done already: domains added & serving, DNS pointed, admin account created.

1. Merge the open PR, redeploy `main`.
2. Set `NEXT_PUBLIC_SITE_URL=https://www.vettedpages.com` in Vercel, redeploy —
   it's currently `https://rocketsloth.space`, so og:url/canonical/OG-image links
   on the live site point at the old domain (bad for FB/Nextdoor shares).
3. Supabase Auth → URL config: site URL `https://www.vettedpages.com` + redirect
   `https://www.vettedpages.com/auth/callback`.
4. Supabase Auth → enable **leaked password protection** (last real
   security-advisor warning).
5. Enable **Web Analytics** in the Vercel project dashboard (Analytics tab) so
   `<Analytics />` starts collecting — if not done yet.
6. Optional, for the ad campaigns: connect the **Meta Ads MCP** (see section above)
   in claude.ai/Claude Desktop.

## Roadmap (explicitly deferred)

Email broadcasts to the waitlist (Resend), Stripe paid listings, quote-request
messaging, geo/map search, company replies to reviews, claim-your-business, a real
contact email (hello@vettedpages.com — then update `/privacy` + `/terms`), and the
rethought review-evidence mechanic. Site launch when the owner has "enough people
and businesses."
