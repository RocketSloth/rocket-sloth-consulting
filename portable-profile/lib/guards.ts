import { and, eq, gte, sql } from 'drizzle-orm'
import { startOfMonth } from 'date-fns'
import { db } from './db/index'
import { users, usageEvents } from './db/schema'

export const LIMITS = {
  smart_import: 10,
  try_message: 200,
  coach_run: 20,
} as const

export type UsageFeature = keyof typeof LIMITS

export async function requirePro(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user?.isPro) {
    return Response.json(
      { error: 'Pro required', code: 'UPGRADE_REQUIRED' },
      { status: 403 }
    )
  }

  return null
}

export async function checkUsageLimit(userId: string, feature: UsageFeature) {
  const periodStart = startOfMonth(new Date())

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageEvents)
    .where(
      and(
        eq(usageEvents.userId, userId),
        eq(usageEvents.feature, feature),
        gte(usageEvents.createdAt, periodStart)
      )
    )

  const used = Number(result[0]?.count ?? 0)
  const limit = LIMITS[feature]

  if (used >= limit) {
    return Response.json(
      {
        error: 'Usage limit reached',
        code: 'LIMIT_REACHED',
        used,
        limit,
      },
      { status: 429 }
    )
  }

  return { used, limit }
}
