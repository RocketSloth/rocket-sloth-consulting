import PostHog from 'posthog-node'
import type { AnalyticsEventName } from './events'

const posthogKey = process.env.POSTHOG_KEY

export const posthog = posthogKey
  ? new PostHog(posthogKey, {
      host: process.env.POSTHOG_HOST || 'https://eu.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  : null

export function track(
  userId: string,
  event: AnalyticsEventName,
  properties: Record<string, unknown> = {}
) {
  if (!posthog) return
  posthog.capture({
    distinctId: userId,
    event,
    properties,
  })
}
