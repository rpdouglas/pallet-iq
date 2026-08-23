import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { ebayAppId, ebayCertId } from '../pricing/params'
import { runWaterfall } from '../pricing/waterfall'
import type { PricingResult } from '../pricing/types'
import type { ItemScanDoc } from './types'

interface PriceItemScanRequest {
  scanId?: unknown
}

// PALLETIQ-026 / ADR-0011. Runs the pricing waterfall against an existing,
// already-identified item_scans doc. No Cloud Tasks queue - none of this
// ticket's waterfall steps call Gemini (grounding data is reused from the
// PALLETIQ-025 identification response, not a fresh call), so there's
// nothing for Governance Check II to gate here; cache/UPC/eBay are plain
// deterministic/network-IO work, cheap enough to resolve inline in the
// callable's own response per ADR-0011's async-boundary note.
export const priceItemScan = onCall<
  PriceItemScanRequest,
  Promise<{ pricing: PricingResult | null }>
>({ secrets: [ebayAppId, ebayCertId], timeoutSeconds: 30 }, async (request) => {
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
  const candidate = scanData.candidates[scanData.selectedCandidateIndex]

  await scanRef.update({
    pricingStatus: 'pricing',
    updatedAt: FieldValue.serverTimestamp(),
  } satisfies Partial<ItemScanDoc>)

  try {
    const pricing = await runWaterfall(candidate, {
      ebayAppId: ebayAppId.value() || null,
      ebayCertId: ebayCertId.value() || null,
    })

    await scanRef.update({
      pricingStatus: pricing ? 'priced' : 'unknown',
      pricing,
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies Partial<ItemScanDoc>)

    return { pricing }
  } catch (err) {
    await scanRef.update({
      pricingStatus: 'failed',
      pricingError: err instanceof Error ? err.message : String(err),
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies Partial<ItemScanDoc>)
    throw new HttpsError('internal', 'Pricing failed.')
  }
})
