import { FieldValue, getFirestore } from 'firebase-admin/firestore'

// PALLETIQ-003 / ADR-0005. Usage-counter hook: atomically bumps
// subscriptions/current.usage[key]. No caller exists yet - Phase 1+
// features call this instead of designing usage tracking from scratch.
export async function incrementUsage(tenantId: string, key: string, amount = 1): Promise<void> {
  await getFirestore()
    .doc(`tenants/${tenantId}/subscriptions/current`)
    .update({
      [`usage.${key}`]: FieldValue.increment(amount),
      updatedAt: FieldValue.serverTimestamp(),
    })
}
