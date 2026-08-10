import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

export type SubscriptionPlan = 'free' | 'pro'
export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled'

// tenants/{tenantId}/subscriptions/current - Cloud-Functions-only, see
// firestore.rules. PALLETIQ-003 / ADR-0005.
export interface SubscriptionDoc {
  plan: SubscriptionPlan
  status: SubscriptionStatus
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  currentPeriodEnd: Timestamp | null
  usage: Record<string, number>
  updatedAt: Timestamp | FieldValue
}
