import type { ConditionGrade, ItemScanCandidate } from '../item-scans/types'
import type { SaleabilityInputs } from '../saleability/computeSaleability'
import type { PriceResearchResponse } from './priceResearch'
import type { PricingComp, PricingFactor, PricingResult } from './types'

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? null)
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index] ?? null
}

// PALLETIQ-027, relocated unchanged from the deleted computePrices.ts by
// PALLETIQ-035/ADR-0012. The saleability formula's price_variance term - a
// 0-1 normalized spread of the comp distribution (0 = tightly clustered,
// predictable price; 1 = wildly scattered). Uses the 10th-90th percentile
// range relative to the median.
export function computePriceVariance(compPrices: number[]): number | null {
  const medianPrice = median(compPrices)
  if (medianPrice === null || medianPrice === 0) return null
  const low = percentile(compPrices, 10) ?? medianPrice
  const high = percentile(compPrices, 90) ?? medianPrice
  return Math.min(1, Math.max(0, (high - low) / medianPrice))
}

function buildAllComps(response: PriceResearchResponse): PricingComp[] {
  return [
    ...response.kijiji.newSealed.examples.map((e): PricingComp => ({
      title: e.title,
      price: e.priceCad,
      url: e.url,
      source: 'kijiji_new',
    })),
    ...response.kijiji.used.examples.map((e): PricingComp => ({
      title: e.title,
      price: e.priceCad,
      url: e.url,
      source: 'kijiji_used',
    })),
    ...response.ebaySold.examples.map((e): PricingComp => ({
      title: e.title,
      price: e.priceCad,
      url: e.url,
      source: 'ebay_sold',
    })),
  ]
}

// PALLETIQ-035. The confidence a research response deserves is computed
// deterministically from the structured facts it reports (sample sizes,
// the ebaySold.thin flag) rather than trusted from the LLM's own
// self-rating - this drives a real buy/pass money decision, and an
// auditable, code-owned calculation is safer than an LLM's self-assessed
// confidence. Same spirit as the old waterfall's stepConfidence(), now
// driven by which research sources returned data rather than which
// vendor-waterfall step ran. eBay sold data (a real clearing price) earns
// the highest confidence tier when present and not thin; Kijiji asking
// data is a real but weaker signal; a bare retail price alone is the
// lowest-confidence tier that still counts as "found something."
function computeConfidence(response: PriceResearchResponse): number {
  let confidence = 0

  if (response.retail.priceCad !== null) {
    confidence = Math.max(confidence, 0.5)
  }

  const kijijiSampleSize = response.kijiji.newSealed.sampleSize + response.kijiji.used.sampleSize
  if (kijijiSampleSize > 0) {
    const kijijiConfidence = kijijiSampleSize >= 5 ? 0.6 : kijijiSampleSize >= 2 ? 0.45 : 0.3
    confidence = Math.max(confidence, kijijiConfidence)
  }

  if (!response.ebaySold.thin && response.ebaySold.sampleSize > 0) {
    const ebayConfidence =
      response.ebaySold.sampleSize >= 10 ? 0.85 : response.ebaySold.sampleSize >= 3 ? 0.65 : 0.45
    confidence = Math.max(confidence, ebayConfidence)
  }

  return confidence
}

function buildStepsUsed(response: PriceResearchResponse): string[] {
  const steps: string[] = []
  if (response.retail.priceCad !== null) steps.push('retail')
  if (response.kijiji.newSealed.sampleSize > 0) steps.push('kijiji_new')
  if (response.kijiji.used.sampleSize > 0) steps.push('kijiji_used')
  if (!response.ebaySold.thin && response.ebaySold.sampleSize > 0) steps.push('ebay_sold')
  if (response.openBox.priceCad !== null) steps.push('open_box')
  return steps
}

function buildFactors(response: PriceResearchResponse, condition: ConditionGrade): PricingFactor[] {
  const factors: PricingFactor[] = [
    {
      label: 'Recommended price rationale',
      direction: 'neutral',
      explanation: response.bottomLine.rationale,
    },
  ]

  if (response.retail.priceCad !== null) {
    factors.push({
      label: `Retail price found via ${response.retail.source ?? 'research'}`,
      direction: 'up',
      explanation: null,
    })
  } else {
    factors.push({ label: 'No retail price found', direction: 'down', explanation: null })
  }

  const kijijiNew = response.kijiji.newSealed.sampleSize
  const kijijiUsed = response.kijiji.used.sampleSize
  if (kijijiNew > 0) {
    factors.push({
      label: `${kijijiNew.toString()} Kijiji new/sealed listing(s) found`,
      direction: kijijiNew >= 3 ? 'up' : 'neutral',
      explanation: null,
    })
  }
  if (kijijiUsed > 0) {
    factors.push({
      label: `${kijijiUsed.toString()} Kijiji used listing(s) found`,
      direction: kijijiUsed >= 3 ? 'up' : 'neutral',
      explanation: null,
    })
  }
  if (kijijiNew === 0 && kijijiUsed === 0) {
    factors.push({ label: 'No Kijiji comps found', direction: 'down', explanation: null })
  }

  if (response.ebaySold.thin || response.ebaySold.sampleSize === 0) {
    factors.push({
      label: 'eBay sold listings thin or unavailable',
      direction: 'down',
      explanation:
        'The most reliable signal of a real clearing price, but not accessible for this item.',
    })
  } else {
    factors.push({
      label: `${response.ebaySold.sampleSize.toString()} eBay sold listing(s) found`,
      direction:
        response.ebaySold.sampleSize >= 10
          ? 'up'
          : response.ebaySold.sampleSize >= 3
            ? 'neutral'
            : 'down',
      explanation: 'Real sold/completed prices, not active asking prices.',
    })
  }

  factors.push({
    label: `Condition: ${condition.replace(/_/g, ' ')}`,
    direction: 'neutral',
    explanation: null,
  })

  for (const flag of response.dataQuality.flags) {
    factors.push({ label: flag, direction: 'down', explanation: null })
  }

  return factors
}

// PALLETIQ-035 / ADR-0012. Maps a price-research response onto the
// existing, unchanged PricingResult shape - the entire UI layer
// (PricingPanel/ItemScanPage/SaleabilityPanel) needs no structural change,
// only copy generalized away from eBay-only language (see PricingPanel.tsx).
export function mapPriceResearchToPricingResult(
  response: PriceResearchResponse,
  candidate: ItemScanCandidate,
): PricingResult {
  const allComps = buildAllComps(response)

  return {
    msrp: response.retail.priceCad,
    salePrice: response.bottomLine.priceCad,
    salePriceLow: response.bottomLine.low,
    salePriceHigh: response.bottomLine.high,
    // PALLETIQ-035 judgment call: PalletIQ's old "liquidationPrice" concept
    // (~10th-25th percentile of comps) and the SOP's "open-box/clearance
    // estimate" (~15-25% below retail) aren't identical, but both serve
    // the same UI purpose - a price meaningfully below salePrice for
    // moving inventory fast. Revisit once real outcome data exists, same
    // posture ADR-0011 already takes toward its other borrowed constants.
    liquidationPrice: response.openBox.priceCad,
    confidence: computeConfidence(response),
    sampleSize: allComps.length,
    factors: buildFactors(response, candidate.condition),
    comps: allComps.slice(0, 10),
    waterfallStepsUsed: buildStepsUsed(response),
  }
}

// PALLETIQ-035. computeSaleability's formula is unchanged (its weight-
// redistribution mechanism, already built for the missing sell_through
// term, cleanly absorbs salesRank being permanently null now that Keepa
// is gone) - only input sourcing changes.
export function buildSaleabilityInputs(
  response: PriceResearchResponse,
  candidate: ItemScanCandidate,
): SaleabilityInputs {
  const allComps = buildAllComps(response)
  const variancePrices = allComps.map((c) => c.price)
  if (response.openBox.priceCad !== null) {
    variancePrices.push(response.openBox.priceCad)
  }

  return {
    priceVariance: computePriceVariance(variancePrices),
    condition: candidate.condition,
    // Active competing asking supply - eBay sold data is excluded here
    // since it's sold (not active/competing) data, folded into
    // sampleSize/priceVariance instead.
    listingCount: response.kijiji.newSealed.sampleSize + response.kijiji.used.sampleSize,
    salesRank: null,
    sampleSize: allComps.length,
  }
}

// PALLETIQ-035. Re-derives saleability inputs from an already-stored
// PricingResult's comps (via their `source` tag) rather than a fresh
// research response - used when there's no live research response to
// hand (a product_price_cache hit in priceItemScanWorker.ts, or a
// saleability-only retry in retrySaleabilityScore.ts with no reason to
// spend a new Gemini call just to re-score).
export function deriveSaleabilityInputsFromPricing(
  pricing: PricingResult,
  condition: ConditionGrade,
): SaleabilityInputs {
  return {
    priceVariance: computePriceVariance(pricing.comps.map((c) => c.price)),
    condition,
    listingCount: pricing.comps.filter(
      (c) => c.source === 'kijiji_new' || c.source === 'kijiji_used',
    ).length,
    salesRank: null,
    sampleSize: pricing.sampleSize,
  }
}
