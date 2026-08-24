import { getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { HttpsError } from 'firebase-functions/v2/https'
import { incrementUsage } from './incrementUsage'
import type { SubscriptionDoc, SubscriptionPlan } from './types'

// PALLETIQ-046. 100/month decided directly with the owner
// (docs/reports/2026-08-24-gemini-cost-audit.md) - generous enough for
// real usage, low enough to stop a runaway/bug from being unbounded. A
// hardcoded constant, not Firestore-configurable - no real need for that
// complexity yet.
const GEMINI_CALL_CAP_BY_PLAN: Record<SubscriptionPlan, number> = {
  free: 100,
  pro: Infinity,
}

// Month-keyed so the cap resets automatically with no scheduled job.
export function geminiCallsUsageKey(date = new Date()): string {
  const year = date.getUTCFullYear().toString()
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  return `geminiCalls_${year}_${month}`
}

// PALLETIQ-046. Best-effort - a metering write failing must never break
// the real feature (a scan/price/listing-copy that actually succeeded),
// so failures are logged, not thrown. Callers pass the exact count of new
// Gemini calls this invocation made (0 is a no-op, e.g. a pricing cache
// hit) - see PALLETIQ-045's researchPricingLegs/synthesizePricing split
// for why this is a real count, not a flat one.
export async function recordGeminiCalls(tenantId: string, count: number): Promise<void> {
  if (count <= 0) return
  try {
    await incrementUsage(tenantId, geminiCallsUsageKey(), count)
  } catch (err) {
    logger.warn('recordGeminiCalls: failed to record usage', {
      tenantId,
      count,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// PALLETIQ-046. Called at the top of every onCall that eventually
// triggers a Gemini call, before the Cloud Tasks dispatch - a capped
// tenant gets a clear rejection immediately, not a `failed` status
// discovered later.
export async function checkGeminiCallCap(tenantId: string): Promise<void> {
  const snap = await getFirestore().doc(`tenants/${tenantId}/subscriptions/current`).get()
  const subscription = snap.data() as SubscriptionDoc | undefined
  const plan: SubscriptionPlan = subscription?.plan ?? 'free'
  const cap = GEMINI_CALL_CAP_BY_PLAN[plan]
  if (cap === Infinity) return

  const used = subscription?.usage[geminiCallsUsageKey()] ?? 0
  if (used >= cap) {
    throw new HttpsError(
      'resource-exhausted',
      `Monthly Gemini usage limit reached (${cap.toString()} calls). Upgrade to Pro for unlimited usage, or try again next month.`,
    )
  }
}
