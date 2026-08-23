import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type { ItemScanDoc } from './types'

interface RetrySaleabilityScoreRequest {
  scanId?: unknown
}

// PALLETIQ-033 / ADR-0011. A dedicated saleability-only retry - re-enqueues
// the same enrichItemScanPricing worker PALLETIQ-027 built, without
// re-running priceItemScan's synchronous waterfall (cache/UPC/grounding/
// eBay). Fixes the wiring gap PALLETIQ-027's Check IV audit logged: the
// saleability-failed retry button previously had no dedicated action to
// call, so it reused priceItemScan (a full re-price) even though pricing
// itself hadn't failed.
export const retrySaleabilityScore = onCall<RetrySaleabilityScoreRequest, Promise<void>>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.')
    }

    const { tenantId, role } = request.auth.token
    if (typeof tenantId !== 'string') {
      throw new HttpsError('permission-denied', 'A tenant membership is required.')
    }
    if (role !== 'owner' && role !== 'buyer') {
      throw new HttpsError('permission-denied', 'Only an Owner or Buyer can re-score a scan.')
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
    // 'priced' and 'unknown' are both legitimate settled states for the
    // synchronous waterfall (see priceItemScan.ts) - either is a valid
    // starting point to re-run enrichment against. 'not_priced'/'pricing'
    // means pricing hasn't settled yet (nothing to re-score); 'failed'
    // means pricing itself is what needs retrying, via priceItemScan.
    if (scanData.pricingStatus !== 'priced' && scanData.pricingStatus !== 'unknown') {
      throw new HttpsError(
        'failed-precondition',
        'This scan needs to be priced before saleability can be scored.',
      )
    }

    await scanRef.update({
      saleabilityStatus: 'scoring',
      saleabilityError: null,
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies Partial<ItemScanDoc>)

    await getFunctions().taskQueue('enrichItemScanPricing').enqueue({ tenantId, scanId })
  },
)
