# Portable Profile Implementation Blueprint

## Locked Scope and Decisions

This blueprint translates the confirmed scope into actionable implementation details.

- Auth: Clerk
- Database: Supabase Postgres + Drizzle ORM
- Billing: Stripe Checkout + Stripe Customer Portal
- Trial model: 7-day trial, no card required at trial start
- Feature limits:
  - Smart Import: 10 / period
  - Try Profile: 200 messages / period
  - Coach: 20 runs / period
- Smart Import: Pro-only
- Email stack: Resend now, Loops later
- Legal pages: first-pass draft now, legal review before launch
- Repo strategy: new product repo with archived legacy prototype as read-only reference

## Timeline (Confirmed)

- Pre-Week 1: April 30–May 1, 2026
- Week 1: May 4–May 8, 2026
- Week 2: May 11–May 15, 2026
- Week 3: May 18–May 22, 2026
- Public beta: May 22, 2026

---

## Data Model (Drizzle + Supabase)

```ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  index,
} from 'drizzle-orm/pg-core'

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
])

export const planEnum = pgEnum('plan', ['monthly', 'annual'])

export const featureEnum = pgEnum('feature', [
  'smart_import',
  'try_message',
  'coach_run',
])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').unique().notNull(),
  isPro: boolean('is_pro').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    status: subscriptionStatusEnum('status').notNull(),
    plan: planEnum('plan'),
    trialEndsAt: timestamp('trial_ends_at'),
    currentPeriodEnd: timestamp('current_period_end'),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({ userIdx: index('subscriptions_user_idx').on(t.userId) })
)

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    data: jsonb('data').notNull(),
    stepIndex: integer('step_index').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({ userIdx: index('profiles_user_idx').on(t.userId) })
)

export const profileVersions = pgTable(
  'profile_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: uuid('profile_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    data: jsonb('data').notNull(),
    stepIndex: integer('step_index').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({ profileIdx: index('profile_versions_profile_idx').on(t.profileId) })
)

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    feature: featureEnum('feature').notNull(),
    periodStart: timestamp('period_start').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userFeaturePeriodIdx: index('usage_events_user_feature_period_idx').on(
      t.userId,
      t.feature,
      t.periodStart
    ),
  })
)
```

### Additional operational table (recommended)

To support webhook idempotency, add a `processed_webhook_events` table:

- `id` UUID PK
- `provider` (`stripe` | `clerk`)
- `external_event_id` unique
- `processed_at` timestamp default now

This prevents duplicate state writes from webhook retries.

---

## API Route Plan

- `POST /api/auth/webhook`: Clerk user lifecycle sync
- `POST /api/billing/checkout`: create Stripe checkout session
- `POST /api/billing/portal`: create portal session
- `GET /api/billing/status`: read billing state
- `POST /api/billing/webhook`: Stripe lifecycle updates
- `GET|POST /api/profiles`: list/create profiles
- `GET|PATCH|DELETE /api/profiles/[id]`: profile CRUD
- `GET /api/profiles/[id]/versions`: latest 20 snapshots
- `POST /api/profiles/[id]/export`: server-side export generator
- `POST /api/ai/smart-import`: pro-only import flow
- `POST /api/ai/try`: pro-only simulation chat
- `POST /api/ai/coach`: pro-only profile coaching
- `GET /api/usage`: current period usage summary

---

## Analytics Taxonomy

Naming standard: `noun_verb` events, camelCase properties.

Core events:

- User lifecycle: `user_signed_up`, `user_signed_in`
- Profiles: `profile_created`, `profile_updated`, `profile_completed`, `profile_deleted`, `profile_exported`
- Billing: `paywall_viewed`, `checkout_started`, `trial_started`, `subscription_activated`, `subscription_canceled`, `billing_portal_opened`
- AI usage: `smart_import_started`, `smart_import_completed`, `smart_import_failed`, `try_message_sent`, `try_conversation_reset`, `coach_run_started`, `coach_run_completed`, `coach_run_failed`, `coach_suggestion_copied`, `coach_section_navigated`
- Limits: `usage_limit_approached`, `usage_limit_reached`

Implementation note: expose a single `track(userId, event, props)` helper and prohibit direct calls to SDK capture methods from business routes.

---

## Delivery Plan

### Pre-Week 1 (2 days)

- Scaffold Next.js App Router project and CI baseline
- Install/initialize Clerk, Supabase, Drizzle, Stripe, PostHog, Resend
- Configure staging environment and env var templates
- Generate/run first DB migration
- Wire Clerk webhook and verify user row sync
- Create Stripe products/prices and verify IDs
- Deploy hello-world staging app on Vercel

### Week 1 (5 days)

- Day 1: DB query layer, auth helpers, pro/usage guards, CI checks
- Day 2: profile CRUD routes + versioning + exports + validation
- Day 3: Stripe checkout/portal/status + webhook processing
- Day 4: AI endpoints (Smart Import/Try/Coach) + usage tracking
- Day 5: client integration pass + staging E2E smoke tests

### Exit criteria for Week 1

- Authenticated users can create and persist multiple profiles
- Stripe trial conversion state toggles Pro entitlements via webhooks
- Pro AI endpoints enforce usage limits and return deterministic errors
- Usage/billing state is retrievable and reflected in client context
- Staging supports end-to-end smoke path from sign-up to Pro feature use
