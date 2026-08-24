import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { geminiApiKey } from '../gemini/params'
import { generateListingCopy } from '../listing-copy/generateListingCopy'
import type { ItemScanDoc } from './types'

interface ListingCopyWorkerPayload {
  tenantId?: unknown
  scanId?: unknown
}

// PALLETIQ-030 / ADR-0014. Same dedicated-worker-per-feature shape
// identifyItem.ts/priceResearch.ts already established (not the generic
// ai_tasks pipeline ADR-0004 originally predicted - see that ADR's own
// 2026-08-24 addendum). A text-only Gemini call - much faster than the
// vision/live-research calls, so no reason to budget as generously as
// priceItemScanWorker.ts's 300s. Governance Check II: never runs inline
// on a user-facing request - enqueueListingCopy (the onCall) only
// enqueues this.
export const listingCopyWorker = onTaskDispatched<ListingCopyWorkerPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    timeoutSeconds: 60,
    secrets: [geminiApiKey],
  },
  async (request) => {
    const { tenantId, scanId } = request.data
    if (typeof tenantId !== 'string' || typeof scanId !== 'string') {
      logger.error('listingCopyWorker: invalid payload', request.data)
      return
    }

    const scanRef = getFirestore().doc(`tenants/${tenantId}/item_scans/${scanId}`)

    try {
      const scanSnap = await scanRef.get()
      const scanData = scanSnap.data() as ItemScanDoc | undefined
      const candidateIndex = scanData?.selectedCandidateIndex
      if (
        !scanData ||
        candidateIndex === null ||
        candidateIndex === undefined ||
        !scanData.pricing ||
        !scanData.saleabilityScore
      ) {
        throw new Error('Item scan is missing a priced, scored candidate to write copy for.')
      }
      const candidate = scanData.candidates[candidateIndex]

      const listingCopy = await generateListingCopy(
        geminiApiKey.value(),
        candidate,
        scanData.pricing,
        scanData.saleabilityScore,
      )

      await scanRef.update({
        listingCopyStatus: 'generated',
        listingCopy,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
    } catch (err) {
      await scanRef.update({
        listingCopyStatus: 'failed',
        listingCopyError: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)
