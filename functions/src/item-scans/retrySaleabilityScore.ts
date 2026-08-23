import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { deriveSaleabilityInputsFromPricing } from '../pricing/mapPriceResearch'
import { computeSaleability } from '../saleability/computeSaleability'
import type { ItemScanDoc } from './types'

interface RetrySaleabilityScoreRequest {
  scanId?: unknown
}

// PALLETIQ-033 / ADR-0011, simplified by PALLETIQ-035 / ADR-0012. Used to
// re-enqueue a background worker (enrichItemScanPricing) to re-fetch a
// separate slow data source (Keepa's sales rank). That source is gone -
// saleability's inputs now all come from the same pricing.comps already
// stored on the scan, so re-scoring is a cheap, synchronous recompute with
// no Gemini call and no task enqueue needed at all. Still fixes the
// original PALLETIQ-027 wiring gap this ticket was opened for: the
// saleability-failed retry button has its own dedicated action rather than
// reusing priceItemScan (a full re-price).
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
    if (scanData.pricingStatus !== 'priced' || !scanData.pricing) {
      throw new HttpsError(
        'failed-precondition',
        'This scan needs to be priced before saleability can be scored.',
      )
    }
    const candidateIndex = scanData.selectedCandidateIndex
    if (candidateIndex === null) {
      throw new HttpsError('failed-precondition', 'This scan has no confirmed candidate.')
    }
    const candidate = scanData.candidates[candidateIndex]

    const saleabilityInputs = deriveSaleabilityInputsFromPricing(
      scanData.pricing,
      candidate.condition,
    )
    const saleability = computeSaleability(saleabilityInputs)

    await scanRef.update({
      saleabilityStatus: 'scored',
      saleabilityScore: saleability,
      saleabilityError: null,
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies Partial<ItemScanDoc>)
  },
)
