import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { checkGeminiCallCap } from '../billing/geminiUsage'
import type { ImportDoc } from './types'

interface EnqueueLotProfitabilityScoreRequest {
  importId?: unknown
}

// PALLETIQ-042 / ADR-0015. Enqueue-only, same shape as priceItemScan.ts -
// the actual research happens in lotProfitabilityWorker.ts's Cloud-Tasks-
// dispatched worker, never inline on this request path (governance
// Check II). Callable once an import has completed, regardless of source
// (a restock.ca-bridged import from PALLETIQ-041, or a regular manual
// upload) - not gated on sourceRestockLotId.
export const enqueueLotProfitabilityScore = onCall<
  EnqueueLotProfitabilityScoreRequest,
  Promise<void>
>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }

  const { tenantId, role } = request.auth.token
  if (typeof tenantId !== 'string') {
    throw new HttpsError('permission-denied', 'A tenant membership is required.')
  }
  if (role !== 'owner' && role !== 'buyer') {
    throw new HttpsError('permission-denied', 'Only an Owner or Buyer can score a lot.')
  }
  // PALLETIQ-046. Before any Cloud Tasks dispatch - a capped tenant fails
  // fast here, not later via a `failed` status. The worker's own SKU cap
  // (lotProfitability.ts) bounds a single import's max call count, but
  // this entry check still matters for a tenant already at/over budget.
  await checkGeminiCallCap(tenantId)

  const { importId } = request.data
  if (typeof importId !== 'string' || !importId) {
    throw new HttpsError('invalid-argument', 'importId is required.')
  }

  const importRef = getFirestore().doc(`tenants/${tenantId}/imports/${importId}`)
  const importSnap = await importRef.get()
  const importData = importSnap.data() as ImportDoc | undefined
  if (!importData) {
    throw new HttpsError('not-found', 'Import not found.')
  }
  if (importData.status !== 'completed') {
    throw new HttpsError(
      'failed-precondition',
      'This import needs to finish importing before it can be scored.',
    )
  }

  await importRef.update({
    profitabilityStatus: 'scoring',
    profitabilityError: null,
    updatedAt: FieldValue.serverTimestamp(),
  } satisfies Partial<ImportDoc>)

  await getFunctions().taskQueue('lotProfitabilityWorker').enqueue({ tenantId, importId })
})
