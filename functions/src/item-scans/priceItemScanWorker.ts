import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { geminiApiKey } from '../gemini/params'
import { computeCacheKey } from '../pricing/cacheKey'
import {
  buildSaleabilityInputs,
  deriveSaleabilityInputsFromPricing,
  mapPriceResearchToPricingResult,
} from '../pricing/mapPriceResearch'
import { researchPricingLegs, synthesizePricing } from '../pricing/priceResearch'
import type { PricingResult, ProductPriceCacheDoc } from '../pricing/types'
import { verifyPricingComps } from '../pricing/verifyComps'
import { computeSaleability } from '../saleability/computeSaleability'
import type { SaleabilityInputs } from '../saleability/computeSaleability'
import type { ItemScanDoc } from './types'

interface PriceItemScanWorkerPayload {
  tenantId?: unknown
  scanId?: unknown
}

// A cached price older than this is treated as a miss, not trusted
// forever - pricing data goes stale in a way a UPC-to-brand mapping
// doesn't. Unchanged from the deleted waterfall.ts.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

// PALLETIQ-035 / ADR-0012. Replaces priceItemScan's old synchronous
// waterfall steps AND enrichItemScanPricing's background enrichment with
// one Cloud-Tasks-dispatched worker - the old two-stage fast/slow split
// was justified by Keepa's sales-rank lookup being a separate slow call;
// pricing is now *entirely* one inherently-slow, multi-source Gemini
// research call, so there's no cheap synchronous step left to split off.
// Saleability is computed in the same invocation too, since its inputs
// all come from the same research response (no more separate slow data
// source to await). Governance Check II: never runs inline on a
// user-facing request - priceItemScan (the onCall) only enqueues this.
export const priceItemScanWorker = onTaskDispatched<PriceItemScanWorkerPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    // Multi-source live web research (search + several page fetches) runs
    // noticeably longer than identifyItem's single grounded call - same
    // generous headroom as processItemScan.ts's own Gemini-call worker.
    timeoutSeconds: 300,
    // PALLETIQ-045. Explicit, matching sibling workers' precedent
    // (processItemScan.ts/processManifestImport.ts, both bumped after past
    // OOM incidents) - this is the heaviest, longest-running, most
    // Gemini-call-dense worker in the app and was previously left on the
    // platform default (256MiB).
    memory: '512MiB',
    secrets: [geminiApiKey],
  },
  async (request) => {
    const { tenantId, scanId } = request.data
    if (typeof tenantId !== 'string' || typeof scanId !== 'string') {
      logger.error('priceItemScanWorker: invalid payload', request.data)
      return
    }

    const scanRef = getFirestore().doc(`tenants/${tenantId}/item_scans/${scanId}`)

    try {
      const scanSnap = await scanRef.get()
      const scanData = scanSnap.data() as ItemScanDoc | undefined
      const candidateIndex = scanData?.selectedCandidateIndex
      if (!scanData || candidateIndex === null || candidateIndex === undefined) {
        throw new Error('Item scan is missing a confirmed candidate to price.')
      }
      const candidate = scanData.candidates[candidateIndex]

      const cacheKey = computeCacheKey(candidate)
      const cacheRef = getFirestore().doc(`product_price_cache/${cacheKey}`)
      const cacheSnap = await cacheRef.get()

      let cachedPricing: PricingResult | null = null
      if (cacheSnap.exists) {
        const cached = cacheSnap.data() as ProductPriceCacheDoc
        const updatedAt = cached.updatedAt as Timestamp
        if (Date.now() - updatedAt.toMillis() < CACHE_TTL_MS) {
          cachedPricing = { ...cached.pricing, waterfallStepsUsed: ['cache'] }
        }
      }

      let pricing: PricingResult
      let saleabilityInputs: SaleabilityInputs

      if (cachedPricing) {
        pricing = cachedPricing
        // A cache hit skips the live research call entirely, so there's
        // no fresh response to derive saleability inputs from - re-derive
        // from the cached comps instead, the same way
        // retrySaleabilityScore.ts does for an already-priced scan.
        saleabilityInputs = deriveSaleabilityInputsFromPricing(pricing, candidate.condition)
      } else {
        // PALLETIQ-045. Reuse any leg that already succeeded on a prior
        // attempt in this same retry chain, instead of re-paying for it -
        // see researchPricingLegs's own header comment.
        const previousLegs = scanData.pricingResearchLegs ?? null
        const { merged, legs, legFailureFlags } = await researchPricingLegs(
          geminiApiKey.value(),
          candidate,
          previousLegs,
        )

        // Persist as soon as computed - if synthesis below fails and
        // Cloud Tasks retries, the next attempt reads this back and skips
        // whatever already succeeded here.
        await scanRef.update({
          pricingResearchLegs: legs,
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies Partial<ItemScanDoc>)

        const research = await synthesizePricing(
          geminiApiKey.value(),
          candidate,
          merged,
          legFailureFlags,
        )
        const mapped = mapPriceResearchToPricingResult(research, candidate)
        // PALLETIQ-037. Verify comp URLs before caching/storing - a
        // cache write should never persist an unverified link, since
        // every future cache hit would then serve it as-is (see
        // verifyComps.ts's own header comment for why this matters).
        pricing = await verifyPricingComps(mapped)
        saleabilityInputs = buildSaleabilityInputs(research, candidate)

        await cacheRef.set({
          pricing,
          updatedAt: FieldValue.serverTimestamp(),
        } satisfies ProductPriceCacheDoc)
      }

      const saleability = computeSaleability(saleabilityInputs)

      await scanRef.update({
        pricingStatus: 'priced',
        pricing,
        // PALLETIQ-045. No longer needed once priced - clears the scratch
        // retry-recovery state rather than leaving it stale on the doc.
        pricingResearchLegs: null,
        saleabilityStatus: 'scored',
        saleabilityScore: saleability,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
    } catch (err) {
      await scanRef.update({
        pricingStatus: 'failed',
        pricingError: err instanceof Error ? err.message : String(err),
        saleabilityStatus: 'failed',
        saleabilityError: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ItemScanDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)
