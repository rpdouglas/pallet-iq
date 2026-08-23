import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { getFunctions } from 'firebase-admin/functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { ebayAppId, ebayCertId } from '../pricing/params'
import { runWaterfall } from '../pricing/waterfall'
import type { PricingResult } from '../pricing/types'
import type { ItemScanDoc } from './types'

interface PriceItemScanRequest {
  scanId?: unknown
}

// PALLETIQ-026 / ADR-0011. Runs the synchronous half of the pricing
// waterfall (cache/UPC/grounding/eBay) against an existing, already-
// identified item_scans doc, resolved inline in this callable's own
// response - none of these steps call Gemini (grounding data is reused
// from the PALLETIQ-025 identification response, not a fresh call), so
// there's nothing for Governance Check II to gate here; cache/UPC/eBay
// are plain deterministic/network-IO work, cheap enough to resolve inline
// per ADR-0011's async-boundary note. Category-specialist enrichment
// (PALLETIQ-027 - Keepa/PriceCharting/Discogs/Google Books, plus the
// saleability score) is slower/paid and runs afterward via Cloud Tasks -
// see enrichItemScanPricing.ts.
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
      saleabilityStatus: 'scoring',
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies Partial<ItemScanDoc>)

    // PALLETIQ-027. Category-specialist enrichment (Keepa/PriceCharting/
    // Discogs/Google Books) and the saleability score both run in the
    // background - "slow/paid steps move to background enrichment," per
    // this ticket's scope note - rather than blocking this callable's
    // response further.
    await getFunctions().taskQueue('enrichItemScanPricing').enqueue({ tenantId, scanId })

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
