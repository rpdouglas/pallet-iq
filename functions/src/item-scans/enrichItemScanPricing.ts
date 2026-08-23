import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { computePriceVariance } from '../pricing/computePrices'
import { runEnrichment } from '../pricing/enrichment'
import { keepaApiKey, priceChartingApiKey } from '../pricing/params'
import type { PricingResult } from '../pricing/types'
import { computeSaleability } from '../saleability/computeSaleability'
import type { ItemScanDoc } from './types'

interface EnrichItemScanPricingPayload {
  tenantId?: unknown
  scanId?: unknown
}

// A synchronous-waterfall miss (pricingStatus 'unknown', pricing null) is a
// legitimate starting point for enrichment too - the "instant estimate"
// just came back empty, not disqualifying. Stands in for existingPricing
// so runEnrichment always has something to refine.
const EMPTY_PRICING_RESULT: PricingResult = {
  msrp: null,
  salePrice: null,
  salePriceLow: null,
  salePriceHigh: null,
  liquidationPrice: null,
  confidence: 0,
  sampleSize: 0,
  factors: [],
  comps: [],
  waterfallStepsUsed: [],
}

// PALLETIQ-027 / ADR-0011. Background enrichment worker - the category-
// specialist step(s) too slow/paid to run inline in priceItemScan's
// synchronous response, per this ticket's scope note ("slow/paid steps
// move to background enrichment... item_scans updates in place as slower
// steps complete"). Also where the saleability score gets computed, since
// it depends on enrichment's Keepa sales-rank signal. Same processing-
// style status lifecycle as processItemScan (PALLETIQ-025).
export const enrichItemScanPricing = onTaskDispatched<EnrichItemScanPricingPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    secrets: [keepaApiKey, priceChartingApiKey],
    timeoutSeconds: 60,
  },
  async (request) => {
    const { tenantId, scanId } = request.data
    if (typeof tenantId !== 'string' || typeof scanId !== 'string') {
      logger.error('enrichItemScanPricing: invalid payload', request.data)
      return
    }

    const scanRef = getFirestore().doc(`tenants/${tenantId}/item_scans/${scanId}`)

    try {
      const scanSnap = await scanRef.get()
      const scanData = scanSnap.data() as ItemScanDoc | undefined
      const candidateIndex = scanData?.selectedCandidateIndex
      if (!scanData || candidateIndex === null || candidateIndex === undefined) {
        throw new Error('Item scan is missing a confirmed candidate to enrich.')
      }
      const candidate = scanData.candidates[candidateIndex]

      const { pricing, salesRank, compPrices } = await runEnrichment(
        candidate,
        scanData.pricing ?? EMPTY_PRICING_RESULT,
        {
          keepaApiKey: keepaApiKey.value() || null,
          priceChartingApiKey: priceChartingApiKey.value() || null,
        },
      )

      const foundSignal = pricing.msrp !== null || pricing.salePrice !== null
      const saleability = computeSaleability({
        priceVariance: computePriceVariance(compPrices),
        condition: candidate.condition,
        listingCount: pricing.comps.length,
        salesRank,
        sampleSize: pricing.sampleSize,
      })

      await scanRef.update({
        pricing: foundSignal ? pricing : null,
        pricingStatus: foundSignal ? 'priced' : 'unknown',
        saleabilityStatus: 'scored',
        saleabilityScore: saleability,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
    } catch (err) {
      await scanRef.update({
        saleabilityStatus: 'failed',
        saleabilityError: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)
