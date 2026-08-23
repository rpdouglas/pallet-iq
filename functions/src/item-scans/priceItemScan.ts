import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { ItemScanDoc } from './types'

interface PriceItemScanRequest {
  scanId?: unknown
}

// PALLETIQ-026 / ADR-0011, re-shaped by PALLETIQ-035 / ADR-0012. Enqueue-
// only now - pricing used to run partly inline here (cache/UPC/grounding/
// eBay were all cheap enough to resolve synchronously), but PALLETIQ-035
// replaced that whole waterfall with a single, inherently-slow Gemini
// research call (priceItemScanWorker.ts), so there's no cheap step left
// to run inline. Same shape as enqueueItemScan.ts now.
export const priceItemScan = onCall<PriceItemScanRequest, Promise<void>>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in first.')
  }

  const { tenantId, role } = request.auth.token
  if (typeof tenantId !== 'string') {
    throw new HttpsError('permission-denied', 'A tenant membership is required.')
  }
  if (role !== 'owner' && role !== 'buyer') {
    throw new HttpsError('permission-denied', 'Only an Owner or Buyer can price a scan.')
  }

  const { scanId } = request.data
  if (typeof scanId !== 'string' || !scanId) {
    throw new HttpsError('invalid-argument', 'scanId is required.')
  }

  const scanRef = getFirestore().doc(`tenants/${tenantId}/item_scans/${scanId}`)
  const scanSnap = await scanRef.get()
  const scanData = scanSnap.data() as ItemScanDoc | undefined
  if (!scanData) {
    throw new HttpsError('not-found', 'Item scan not found.')
  }
  if (scanData.status !== 'completed' || scanData.selectedCandidateIndex === null) {
    throw new HttpsError(
      'failed-precondition',
      'This scan needs a confirmed identification before it can be priced.',
    )
  }

  await scanRef.update({
    pricingStatus: 'pricing',
    updatedAt: FieldValue.serverTimestamp(),
  } satisfies Partial<ItemScanDoc>)

  await getFunctions().taskQueue('priceItemScanWorker').enqueue({ tenantId, scanId })
})
