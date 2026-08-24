import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { checkGeminiCallCap } from '../billing/geminiUsage'
import type { ItemScanDoc } from './types'

interface EnqueueListingCopyRequest {
  scanId?: unknown
}

// PALLETIQ-030 / ADR-0014. Owner/Manager only, not Buyer - listing copy is
// a sell-side action (Store Manager owns Listed -> Sold per
// docs/personas/store-manager.md), triggered explicitly per scan rather
// than automatically once priced (unlike priceItemScan, which
// ItemScanPage.tsx auto-starts - there's no reason to generate copy for
// every scan the instant it's priced). Enqueue-only, matching
// priceItemScan.ts's own shape - the actual Gemini call happens in
// listingCopyWorker.ts.
export const enqueueListingCopy = onCall<EnqueueListingCopyRequest, Promise<void>>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in first.')
    }

    const { tenantId, role } = request.auth.token
    if (typeof tenantId !== 'string') {
      throw new HttpsError('permission-denied', 'A tenant membership is required.')
    }
    if (role !== 'owner' && role !== 'manager') {
      throw new HttpsError(
        'permission-denied',
        'Only an Owner or Store Manager can generate listing copy.',
      )
    }
    // PALLETIQ-046. Before any Cloud Tasks dispatch - a capped tenant
    // fails fast here, not later via a `failed` status.
    await checkGeminiCallCap(tenantId)

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
        'This scan needs to be priced before listing copy can be generated.',
      )
    }
    if (scanData.saleabilityStatus !== 'scored' || !scanData.saleabilityScore) {
      throw new HttpsError(
        'failed-precondition',
        'This scan needs a saleability score before listing copy can be generated.',
      )
    }
    if (scanData.selectedCandidateIndex === null) {
      throw new HttpsError('failed-precondition', 'This scan has no confirmed candidate.')
    }

    await scanRef.update({
      listingCopyStatus: 'generating',
      listingCopyError: null,
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies Partial<ItemScanDoc>)

    await getFunctions().taskQueue('listingCopyWorker').enqueue({ tenantId, scanId })
  },
)
