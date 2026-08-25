import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { onTaskDispatched } from 'firebase-functions/v2/tasks'
import { recordGeminiCalls } from '../billing/geminiUsage'
import { geminiApiKey } from '../gemini/params'
import { computeCacheKey } from '../pricing/cacheKey'
import { mapPriceResearchToPricingResult } from '../pricing/mapPriceResearch'
import { researchPricingLegs, synthesizePricing } from '../pricing/priceResearch'
import type { PricingResult, ProductPriceCacheDoc } from '../pricing/types'
import { verifyPricingComps } from '../pricing/verifyComps'
import {
  aggregateLotProfitability,
  buildResearchCandidate,
  groupLineItems,
  selectGroupsToResearch,
} from './lotProfitability'
import type { GroupResearchOutcome, LineItemGroup } from './lotProfitability'
import type { ImportDoc, LineItemDoc } from './types'

interface LotProfitabilityWorkerPayload {
  tenantId?: unknown
  importId?: unknown
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

// How many distinct SKUs' pricing research runs concurrently - bounds
// wall-clock time (sequential would be minutes for a lot near the SKU
// cap) without firing dozens of Gemini calls simultaneously the way full
// concurrency across SKU_RESEARCH_CAP groups would.
const RESEARCH_CONCURRENCY = 5

interface GroupPriceOutcome {
  salePrice: number | null
  callsMade: number
}

// One SKU's research failing (a thrown synthesis error, a transient
// network issue) must not sink the whole lot's score - same
// degrade-gracefully posture priceResearch.ts's own Promise.allSettled
// leg handling already uses one level down. A failed group is simply
// "not researched" for aggregation purposes.
async function priceGroupSafely(apiKey: string, group: LineItemGroup): Promise<GroupPriceOutcome> {
  try {
    const candidate = buildResearchCandidate(group.representative)
    const cacheKey = computeCacheKey(candidate)
    const cacheRef = getFirestore().doc(`product_price_cache/${cacheKey}`)
    const cacheSnap = await cacheRef.get()

    if (cacheSnap.exists) {
      const cached = cacheSnap.data() as ProductPriceCacheDoc
      const updatedAt = cached.updatedAt as Timestamp
      if (Date.now() - updatedAt.toMillis() < CACHE_TTL_MS) {
        return { salePrice: cached.pricing.salePrice, callsMade: 0 }
      }
    }

    const { merged, legFailureFlags, callsMade } = await researchPricingLegs(
      apiKey,
      candidate,
      null,
    )
    const research = await synthesizePricing(apiKey, candidate, merged, legFailureFlags)
    const mapped = mapPriceResearchToPricingResult(research, candidate)
    // PALLETIQ-037 invariant: never cache an unverified comp link, same
    // as priceItemScanWorker.ts - this cache is shared across both
    // callers.
    const pricing: PricingResult = await verifyPricingComps(mapped)

    await cacheRef.set({
      pricing,
      updatedAt: FieldValue.serverTimestamp(),
    } satisfies ProductPriceCacheDoc)

    return { salePrice: pricing.salePrice, callsMade: callsMade + 1 }
  } catch (err) {
    logger.warn('lotProfitabilityWorker: SKU research failed, counted as not researched', {
      groupKey: group.key,
      error: err instanceof Error ? err.message : String(err),
    })
    return { salePrice: null, callsMade: 0 }
  }
}

async function priceGroupsWithConcurrency(
  apiKey: string,
  groups: readonly LineItemGroup[],
): Promise<{ outcomes: GroupResearchOutcome[]; totalCallsMade: number }> {
  const outcomes: GroupResearchOutcome[] = []
  let totalCallsMade = 0
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < groups.length) {
      const index = cursor
      cursor += 1
      const group = groups[index]
      const { salePrice, callsMade } = await priceGroupSafely(apiKey, group)
      outcomes.push({ group, salePrice })
      totalCallsMade += callsMade
    }
  }

  await Promise.all(Array.from({ length: Math.min(RESEARCH_CONCURRENCY, groups.length) }, worker))
  return { outcomes, totalCallsMade }
}

// PALLETIQ-042 / ADR-0015. Scores an already-completed import's
// profitability by deduplicating its line items into distinct SKUs,
// researching each via the existing, unmodified priceResearch.ts (no
// Gemini vision call - manifest data is already text), and aggregating
// against landed cost. Governance Check II: only ever runs inside this
// Cloud-Tasks-dispatched worker, enqueueLotProfitabilityScore (the
// onCall) only enqueues it.
export const lotProfitabilityWorker = onTaskDispatched<LotProfitabilityWorkerPayload>(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 10 },
    rateLimits: { maxConcurrentDispatches: 5 },
    // Up to SKU_RESEARCH_CAP distinct SKUs researched at
    // RESEARCH_CONCURRENCY-way concurrency - generous headroom over
    // priceItemScanWorker.ts's single-item 300s budget.
    timeoutSeconds: 540,
    memory: '512MiB',
    secrets: [geminiApiKey],
  },
  async (request) => {
    const { tenantId, importId } = request.data
    if (typeof tenantId !== 'string' || typeof importId !== 'string') {
      logger.error('lotProfitabilityWorker: invalid payload', request.data)
      return
    }

    const db = getFirestore()
    const importRef = db.doc(`tenants/${tenantId}/imports/${importId}`)

    try {
      const importSnap = await importRef.get()
      const importData = importSnap.data() as ImportDoc | undefined
      if (!importData) {
        throw new Error('Import no longer exists.')
      }

      const lineItemsSnap = await db
        .collection(`tenants/${tenantId}/manifests/${importId}/lineItems`)
        .get()
      const lineItems = lineItemsSnap.docs.map((d) => d.data() as LineItemDoc)

      const groups = groupLineItems(lineItems)
      const groupsToResearch = selectGroupsToResearch(groups)

      const { outcomes, totalCallsMade } = await priceGroupsWithConcurrency(
        geminiApiKey.value(),
        groupsToResearch,
      )
      await recordGeminiCalls(tenantId, totalCallsMade)

      const profitability = aggregateLotProfitability(
        lineItems,
        groups.length,
        outcomes,
        importData.freightCost,
        importData.otherFees,
      )

      await importRef.update({
        profitabilityStatus: 'scored',
        profitability,
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)
    } catch (err) {
      await importRef.update({
        profitabilityStatus: 'failed',
        profitabilityError: err instanceof Error ? err.message : String(err),
        updatedAt: FieldValue.serverTimestamp(),
      } satisfies Partial<ImportDoc>)
      throw err // let Cloud Tasks retry per retryConfig
    }
  },
)
