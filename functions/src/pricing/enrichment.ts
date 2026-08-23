import type { ItemScanCandidate } from '../item-scans/types'
import { classifyCategoryProfile, classifyMediaSubtype } from './categoryProfile'
import { computeLiquidationPrice, computeMsrp, computeSalePrice } from './computePrices'
import { lookupDiscogs } from './discogs'
import { lookupGoogleBooks } from './googleBooks'
import { lookupKeepa } from './keepa'
import { lookupPriceCharting } from './priceCharting'
import type { PricingFactor, PricingResult } from './types'

export interface EnrichmentDeps {
  keepaApiKey: string | null
  priceChartingApiKey: string | null
}

export interface EnrichmentResult {
  /** The refined pricing result - identical to the input when no new signal was found. */
  pricing: PricingResult
  /** Amazon sales rank via Keepa, when a match was found - feeds the saleability score, not stored on PricingResult itself. */
  salesRank: number | null
  /** The full comp-price pool (eBay + any specialist comp) used for salePrice/liquidationPrice - exposed so the caller can compute price_variance for the saleability score without re-deriving it. */
  compPrices: number[]
}

// PALLETIQ-027 / ADR-0011. Background enrichment: the category-specialist
// step(s) too slow/paid to run inline in priceItemScan's synchronous
// response (Keepa, PriceCharting, Discogs, Google Books), per this
// ticket's own scope note ("slow/paid steps move to background
// enrichment... item_scans updates in place as slower steps complete").
// Runs after PALLETIQ-026's synchronous waterfall has already produced an
// instant estimate; folds any new signal into a refined PricingResult
// rather than replacing it outright - the existing msrp/comps are treated
// as inputs to the next consensus round, not discarded.
export async function runEnrichment(
  candidate: ItemScanCandidate,
  existingPricing: PricingResult,
  deps: EnrichmentDeps,
): Promise<EnrichmentResult> {
  const profile = classifyCategoryProfile(candidate.category)
  const query = [candidate.brand, candidate.itemName].filter((v): v is string => !!v).join(' ')

  let extraRetailPrice: number | null = null
  let extraCompPrice: number | null = null
  let salesRank: number | null = null
  const newSteps: string[] = []

  try {
    if (profile === 'electronics' && candidate.barcodeNumber && deps.keepaApiKey) {
      const keepa = await lookupKeepa(deps.keepaApiKey, candidate.barcodeNumber)
      if (keepa) {
        salesRank = keepa.salesRank
        if (keepa.buyBoxPrice !== null) {
          extraRetailPrice = keepa.buyBoxPrice
          newSteps.push('keepa')
        }
      }
    } else if (profile === 'games' && candidate.barcodeNumber && deps.priceChartingApiKey) {
      const priceCharting = await lookupPriceCharting(
        deps.priceChartingApiKey,
        candidate.barcodeNumber,
      )
      if (priceCharting) {
        if (priceCharting.newPrice !== null) {
          extraRetailPrice = priceCharting.newPrice
        }
        const compPrice = priceCharting.cibPrice ?? priceCharting.loosePrice
        if (compPrice !== null) {
          extraCompPrice = compPrice
        }
        if (priceCharting.newPrice !== null || compPrice !== null) {
          newSteps.push('pricecharting')
        }
      }
    } else if (profile === 'media') {
      if (classifyMediaSubtype(candidate.category) === 'book' && candidate.barcodeNumber) {
        const googleBooks = await lookupGoogleBooks(candidate.barcodeNumber)
        if (googleBooks?.listPrice !== null && googleBooks?.listPrice !== undefined) {
          extraRetailPrice = googleBooks.listPrice
          newSteps.push('googlebooks')
        }
      } else {
        const discogs = await lookupDiscogs(query || candidate.itemName)
        if (discogs?.lowestPrice !== null && discogs?.lowestPrice !== undefined) {
          extraCompPrice = discogs.lowestPrice
          newSteps.push('discogs')
        }
      }
    }
  } catch {
    // A specialist source being unavailable/misconfigured shouldn't fail
    // enrichment - fall through with whatever the synchronous waterfall
    // already found, same posture as the eBay step in waterfall.ts.
  }

  if (newSteps.length === 0) {
    return {
      pricing: existingPricing,
      salesRank,
      compPrices: existingPricing.comps.map((c) => c.price),
    }
  }

  const msrpResult = computeMsrp([existingPricing.msrp, extraRetailPrice])
  const compPrices = [
    ...existingPricing.comps.map((c) => c.price),
    ...(extraCompPrice !== null ? [extraCompPrice] : []),
  ]
  const saleResult = computeSalePrice(compPrices, candidate.condition)
  const liquidationPrice = computeLiquidationPrice(compPrices, candidate.condition)

  const factors: PricingFactor[] = [...existingPricing.factors, ...buildEnrichmentFactors(newSteps)]

  const pricing: PricingResult = {
    msrp: msrpResult.msrp,
    salePrice: saleResult?.point ?? existingPricing.salePrice,
    salePriceLow: saleResult?.low ?? existingPricing.salePriceLow,
    salePriceHigh: saleResult?.high ?? existingPricing.salePriceHigh,
    liquidationPrice: liquidationPrice ?? existingPricing.liquidationPrice,
    confidence: Math.max(existingPricing.confidence, 0.75),
    sampleSize: compPrices.length,
    factors,
    comps: existingPricing.comps,
    waterfallStepsUsed: [...existingPricing.waterfallStepsUsed, ...newSteps],
  }

  return { pricing, salesRank, compPrices }
}

function buildEnrichmentFactors(newSteps: string[]): PricingFactor[] {
  const labels: Record<string, string> = {
    keepa: 'Amazon price data found via Keepa',
    pricecharting: 'Collectibles price guide match found via PriceCharting',
    discogs: 'Marketplace price found via Discogs',
    googlebooks: 'List price found via Google Books',
  }
  return newSteps
    .filter((step) => step in labels)
    .map((step) => ({ label: labels[step] ?? step, direction: 'up' as const, explanation: null }))
}
