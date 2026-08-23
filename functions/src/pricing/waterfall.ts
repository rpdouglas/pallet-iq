import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore'
import type { ItemScanCandidate } from '../item-scans/types'
import { searchActiveListings } from './ebayBrowseApi'
import { lookupUpc } from './upcLookup'
import { computeLiquidationPrice, computeMsrp, computeSalePrice } from './computePrices'
import type { PricingFactor, PricingResult, ProductPriceCacheDoc } from './types'

// Above this, the waterfall stops early rather than running every
// available step for the category - matches identifyItem.ts's
// CONFIDENCE_THRESHOLD concept, kept as a separate constant since pricing
// confidence and identification confidence measure different things.
export const PRICING_CONFIDENCE_THRESHOLD = 0.6

// A cached price older than this is treated as a miss, not trusted
// forever - pricing data goes stale in a way a UPC-to-brand mapping
// doesn't.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

type CategoryProfile = 'electronics' | 'games' | 'media' | 'tools' | 'fashion'
type WaterfallStep = 'upc' | 'grounding' | 'ebay'

// docs/projects/treasure-hunter-plan.md section 4's category-conditional
// ordering table, reduced to the steps actually available in this ticket -
// Keepa/PriceCharting/Discogs/Google Books (category specialists) are
// PALLETIQ-027, so those table entries are dropped rather than
// approximated with the wrong source.
const PROFILE_STEPS: Record<CategoryProfile, WaterfallStep[]> = {
  electronics: ['upc', 'grounding', 'ebay'],
  games: ['ebay', 'grounding'],
  media: ['upc', 'grounding'],
  tools: ['upc', 'grounding', 'ebay'],
  fashion: ['grounding'],
}

function classifyCategoryProfile(category: string): CategoryProfile {
  const c = category.toLowerCase()
  if (/game|card|collectible|toy|funko|lego/.test(c)) return 'games'
  if (/book|vinyl|\bcd\b|music|media|isbn/.test(c)) return 'media'
  if (/fashion|sneaker|shoe|apparel|clothing|streetwear/.test(c)) return 'fashion'
  if (/tool|home good|hardware/.test(c)) return 'tools'
  return 'electronics'
}

function computeCacheKey(candidate: ItemScanCandidate): string {
  if (candidate.barcodeNumber) {
    return `upc:${candidate.barcodeNumber}`
  }
  const fingerprint = [candidate.brand, candidate.model, candidate.itemName]
    .filter((v): v is string => !!v)
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return `fp:${fingerprint}`
}

function stepConfidence(stepsUsed: string[], sampleSize: number): number {
  let confidence = 0
  if (stepsUsed.includes('upc')) confidence = Math.max(confidence, 0.75)
  if (stepsUsed.includes('grounding')) confidence = Math.max(confidence, 0.55)
  if (stepsUsed.includes('ebay')) {
    const ebayConfidence = sampleSize >= 10 ? 0.7 : sampleSize >= 3 ? 0.5 : 0.3
    confidence = Math.max(confidence, ebayConfidence)
  }
  return confidence
}

function buildFactors(params: {
  stepsUsed: string[]
  sampleSize: number
  sourcesAgree: boolean | null
  hasBarcode: boolean
  condition: string
}): PricingFactor[] {
  const factors: PricingFactor[] = []

  if (params.stepsUsed.includes('ebay')) {
    factors.push({
      label: `${params.sampleSize.toString()} active eBay listing(s) found`,
      direction: params.sampleSize >= 10 ? 'up' : params.sampleSize >= 3 ? 'neutral' : 'down',
      explanation: 'Active asking prices, scaled by a calibrated discount ratio - not sold data.',
    })
  } else {
    factors.push({
      label: 'No eBay comps found',
      direction: 'down',
      explanation: null,
    })
  }

  if (!params.hasBarcode) {
    factors.push({
      label: 'No barcode - vision identification only',
      direction: 'down',
      explanation: null,
    })
  }

  if (params.stepsUsed.includes('grounding')) {
    factors.push({
      label: 'Retail price found via Google Search grounding',
      direction: 'up',
      explanation: null,
    })
  }

  if (params.sourcesAgree === true) {
    factors.push({ label: 'Retail price sources agree', direction: 'up', explanation: null })
  } else if (params.sourcesAgree === false) {
    factors.push({ label: 'Retail price sources disagree', direction: 'down', explanation: null })
  }

  factors.push({
    label: `Condition: ${params.condition.replace(/_/g, ' ')}`,
    direction: 'neutral',
    explanation: null,
  })

  return factors
}

export interface WaterfallDeps {
  ebayAppId: string | null
  ebayCertId: string | null
}

// PALLETIQ-026 / ADR-0011. The pricing waterfall: cache -> category-
// ordered steps among {upc, grounding, ebay} (Keepa/category specialists
// are PALLETIQ-027) -> price computation -> cache write-through. Returns
// null when no step found any usable signal at all - the caller writes
// that as pricingStatus 'unknown', a legitimate terminal state per the
// plan's "say so when it doesn't know" principle, not an error.
export async function runWaterfall(
  candidate: ItemScanCandidate,
  deps: WaterfallDeps,
): Promise<PricingResult | null> {
  const cacheKey = computeCacheKey(candidate)
  const db = getFirestore()
  const cacheRef = db.doc(`product_price_cache/${cacheKey}`)

  const cacheSnap = await cacheRef.get()
  if (cacheSnap.exists) {
    const cached = cacheSnap.data() as ProductPriceCacheDoc
    const updatedAt = cached.updatedAt as Timestamp
    if (Date.now() - updatedAt.toMillis() < CACHE_TTL_MS) {
      return { ...cached.pricing, waterfallStepsUsed: ['cache'] }
    }
  }

  const groundedRetailPrice = candidate.groundedRetailPrice
  let upcMedianOfferPrice: number | null = null
  let ebayListings: { title: string; price: number; url: string | null }[] = []
  const stepsUsed: string[] = []

  const profile = classifyCategoryProfile(candidate.category)
  const query = [candidate.brand, candidate.model ?? candidate.itemName]
    .filter((v): v is string => !!v)
    .join(' ')

  for (const step of PROFILE_STEPS[profile]) {
    if (step === 'upc' && candidate.barcodeNumber) {
      const upcResult = await lookupUpc(candidate.barcodeNumber)
      if (upcResult) {
        upcMedianOfferPrice = upcResult.medianOfferPrice
        if (upcMedianOfferPrice !== null) stepsUsed.push('upc')
      }
    } else if (step === 'grounding') {
      if (groundedRetailPrice !== null) stepsUsed.push('grounding')
    } else if (step === 'ebay' && deps.ebayAppId && deps.ebayCertId) {
      try {
        ebayListings = await searchActiveListings(
          deps.ebayAppId,
          deps.ebayCertId,
          query || candidate.itemName,
        )
        if (ebayListings.length > 0) stepsUsed.push('ebay')
      } catch {
        // eBay being unavailable/misconfigured shouldn't fail the whole
        // waterfall - fall through with whatever signal was already found.
      }
    }

    if (stepConfidence(stepsUsed, ebayListings.length) >= PRICING_CONFIDENCE_THRESHOLD) {
      break
    }
  }

  const msrpResult = computeMsrp({ groundedRetailPrice, upcMedianOfferPrice })
  const compPrices = ebayListings.map((l) => l.price)
  const saleResult = computeSalePrice(compPrices, candidate.condition)
  const liquidationPrice = computeLiquidationPrice(compPrices, candidate.condition)

  if (msrpResult.msrp === null && saleResult === null) {
    return null
  }

  const result: PricingResult = {
    msrp: msrpResult.msrp,
    salePrice: saleResult?.point ?? null,
    salePriceLow: saleResult?.low ?? null,
    salePriceHigh: saleResult?.high ?? null,
    liquidationPrice,
    confidence: stepConfidence(stepsUsed, ebayListings.length),
    sampleSize: ebayListings.length,
    factors: buildFactors({
      stepsUsed,
      sampleSize: ebayListings.length,
      sourcesAgree: msrpResult.sourcesAgree,
      hasBarcode: !!candidate.barcodeNumber,
      condition: candidate.condition,
    }),
    comps: ebayListings.slice(0, 10),
    waterfallStepsUsed: stepsUsed,
  }

  await cacheRef.set({
    pricing: result,
    updatedAt: FieldValue.serverTimestamp(),
  } satisfies ProductPriceCacheDoc)

  return result
}
