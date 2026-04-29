export const ANALYTICS_EVENTS = {
  userSignedUp: 'user_signed_up',
  userSignedIn: 'user_signed_in',

  profileCreated: 'profile_created',
  profileUpdated: 'profile_updated',
  profileCompleted: 'profile_completed',
  profileDeleted: 'profile_deleted',
  profileExported: 'profile_exported',

  paywallViewed: 'paywall_viewed',
  checkoutStarted: 'checkout_started',
  trialStarted: 'trial_started',
  subscriptionActivated: 'subscription_activated',
  subscriptionCanceled: 'subscription_canceled',
  billingPortalOpened: 'billing_portal_opened',

  smartImportStarted: 'smart_import_started',
  smartImportCompleted: 'smart_import_completed',
  smartImportFailed: 'smart_import_failed',
  tryMessageSent: 'try_message_sent',
  tryConversationReset: 'try_conversation_reset',
  coachRunStarted: 'coach_run_started',
  coachRunCompleted: 'coach_run_completed',
  coachRunFailed: 'coach_run_failed',
  coachSuggestionCopied: 'coach_suggestion_copied',
  coachSectionNavigated: 'coach_section_navigated',

  usageLimitApproached: 'usage_limit_approached',
  usageLimitReached: 'usage_limit_reached',
} as const

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]
