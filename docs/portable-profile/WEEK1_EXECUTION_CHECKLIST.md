# Week 1 Execution Checklist (Portable Profile)

## Pre-Week 1 (Apr 30–May 1, 2026)

### Day P1 — Scaffold
- [ ] Create new private repo (`portable-profile`)
- [ ] Add `/legacy-prototype` and mark read-only in README
- [ ] Scaffold Next.js (TS, App Router, Tailwind, ESLint)
- [ ] Install SDK dependencies (Clerk, Stripe, Drizzle, Supabase, PostHog, Resend)
- [ ] Commit `.env.example` with all required variables
- [ ] Configure staging env vars in Vercel

### Day P2 — Wire + Deploy
- [ ] Create Supabase staging DB + run initial Drizzle migration
- [ ] Create Stripe test products and capture price IDs
- [ ] Create Clerk app and webhook endpoint
- [ ] Implement user sync webhook
- [ ] Add analytics event constants and tracking helper
- [ ] Deploy to staging and verify user create sync

## Week 1 (May 4–May 8, 2026)

### Day 1 — Foundation
- [ ] Implement DB query modules
- [ ] Implement `requireAuth`, `requirePro`, `checkUsageLimit`
- [ ] Add `processed_webhook_events` for idempotency
- [ ] Add CI checks (`lint`, `typecheck`, migration sanity)

### Day 2 — Profiles API
- [ ] Implement `GET/POST /api/profiles`
- [ ] Implement `GET/PATCH/DELETE /api/profiles/[id]`
- [ ] Implement version snapshots + prune to last 20
- [ ] Implement `POST /api/profiles/[id]/export`
- [ ] Add route-level validation with Zod

### Day 3 — Billing
- [ ] Implement checkout session API
- [ ] Implement billing portal API
- [ ] Implement billing status API
- [ ] Implement Stripe webhook handler + idempotency
- [ ] Verify trial start toggles Pro state

### Day 4 — AI + Usage
- [ ] Implement Smart Import endpoint
- [ ] Implement Try endpoint
- [ ] Implement Coach endpoint
- [ ] Implement usage summary endpoint
- [ ] Verify 403 and 429 behavior

### Day 5 — Integration + Smoke
- [ ] Replace local storage calls with API client calls
- [ ] Wire Pro/usage context into app UI
- [ ] Run full staging smoke flow
- [ ] Log known defects for Week 2
- [ ] Tag alpha build (`v0.1.0-alpha`)

## Smoke test script

- [ ] Sign up and confirm local user row exists
- [ ] Create/edit/export profile
- [ ] Trigger paywall then complete trial
- [ ] Use Try/Coach/Smart Import as Pro
- [ ] Exceed one feature limit and verify handling
- [ ] Open billing portal and cancel subscription
