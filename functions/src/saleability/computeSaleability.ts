import type { ConditionGrade } from '../item-scans/types'
import { CONDITION_SALE_MULTIPLIERS } from '../pricing/computePrices'
import type { PricingFactor } from '../pricing/types'

type Term = 'priceVariance' | 'condition' | 'listingSaturation' | 'salesRank' | 'sampleConfidence'

// docs/projects/treasure-hunter-plan.md section 7's formula:
//   saleability = 0.30*sell_through + 0.20*(1-price_variance) + 0.20*condition
//               + 0.15*(1-listing_saturation) + 0.10*sales_rank + 0.05*sample_confidence
//
// sell_through has no real data source anywhere in this codebase yet - it
// needs actual sold-vs-active comp counts, which needs eBay Marketplace
// Insights (gated, PALLETIQ-028). Its 0.30 weight is always redistributed
// across the other five terms below, using the exact fallback mechanism
// the plan itself specifies for a missing sales_rank term ("weight
// redistributes proportionally across the others rather than zeroing out
// the score") - confirmed with the owner during this ticket's planning
// rather than assumed silently. sales_rank uses the same redistribution
// when no Keepa match exists.
const BASE_WEIGHTS: Record<Term, number> = {
  priceVariance: 0.2,
  condition: 0.2,
  listingSaturation: 0.15,
  salesRank: 0.1,
  sampleConfidence: 0.05,
}

export interface SaleabilityInputs {
  /** 0-1, from computePriceVariance - null when there's no comp sample to measure spread from. */
  priceVariance: number | null
  condition: ConditionGrade
  /** Count of active competing listings (the pricing waterfall's eBay sampleSize). */
  listingCount: number
  /** Amazon sales rank via Keepa, when a match was found. */
  salesRank: number | null
  /** Comp sample size backing priceVariance/listingCount. */
  sampleSize: number
}

export interface SaleabilityResult {
  /** 0-1. */
  score: number
  factors: PricingFactor[]
}

function normalizeListingSaturation(listingCount: number): number {
  // 20+ active competing listings treated as fully saturated - an
  // uncalibrated starting point ("treat every weight as a first guess"),
  // same posture as this codebase's other borrowed pricing constants.
  return Math.min(listingCount / 20, 1)
}

function normalizeSalesRank(rank: number): number {
  // Log-scale: rank <= 10 -> ~1 (bestseller), rank >= 1,000,000 -> 0.
  // Standard sales-rank-to-score treatment, not calibrated against
  // PalletIQ's own outcome data yet (PALLETIQ-028).
  const clamped = Math.max(10, Math.min(rank, 1_000_000))
  return 1 - Math.log10(clamped / 10) / Math.log10(1_000_000 / 10)
}

function normalizeSampleConfidence(sampleSize: number): number {
  // Plan: "under 5-10 comps... should read as tentative, not certain."
  return Math.min(sampleSize / 10, 1)
}

function buildFactors(
  inputs: SaleabilityInputs,
  terms: Partial<Record<Term, number>>,
): PricingFactor[] {
  const factors: PricingFactor[] = [
    {
      label: 'Sell-through rate not available yet',
      direction: 'neutral',
      explanation:
        'Needs real sold-comps data (PALLETIQ-028) - this score weighs the other five factors only.',
    },
  ]

  const priceVarianceTerm = terms.priceVariance
  if (priceVarianceTerm !== undefined) {
    factors.push({
      label:
        priceVarianceTerm >= 0.7 ? 'Tightly clustered comp prices' : 'Widely scattered comp prices',
      direction: priceVarianceTerm >= 0.7 ? 'up' : 'down',
      explanation: null,
    })
  }

  const conditionTerm = terms.condition ?? 0
  factors.push({
    label: `Condition: ${inputs.condition.replace(/_/g, ' ')}`,
    direction: conditionTerm >= 0.775 ? 'up' : conditionTerm <= 0.5 ? 'down' : 'neutral',
    explanation: null,
  })

  factors.push({
    label: `${inputs.listingCount.toString()} active competing listing(s)`,
    direction: inputs.listingCount <= 5 ? 'up' : inputs.listingCount >= 15 ? 'down' : 'neutral',
    explanation: null,
  })

  const salesRankTerm = terms.salesRank
  if (inputs.salesRank !== null && salesRankTerm !== undefined) {
    factors.push({
      label: `Amazon sales rank #${inputs.salesRank.toLocaleString()}`,
      direction: salesRankTerm >= 0.6 ? 'up' : salesRankTerm <= 0.3 ? 'down' : 'neutral',
      explanation: null,
    })
  } else {
    factors.push({ label: 'No Amazon sales rank data', direction: 'neutral', explanation: null })
  }

  if (inputs.sampleSize < 5) {
    factors.push({
      label: `Thin comp sample (${inputs.sampleSize.toString()})`,
      direction: 'down',
      explanation: 'Score is more tentative with fewer than 5-10 comps.',
    })
  }

  return factors
}

export function computeSaleability(inputs: SaleabilityInputs): SaleabilityResult {
  const terms: Partial<Record<Term, number>> = {
    condition: CONDITION_SALE_MULTIPLIERS[inputs.condition],
    listingSaturation: 1 - normalizeListingSaturation(inputs.listingCount),
    sampleConfidence: normalizeSampleConfidence(inputs.sampleSize),
  }
  if (inputs.priceVariance !== null) {
    terms.priceVariance = 1 - inputs.priceVariance
  }
  if (inputs.salesRank !== null) {
    terms.salesRank = normalizeSalesRank(inputs.salesRank)
  }

  const termKeys = Object.keys(terms) as Term[]
  const availableWeight = termKeys.reduce((sum, key) => sum + BASE_WEIGHTS[key], 0)

  let score = 0
  for (const key of termKeys) {
    const value = terms[key]
    if (value === undefined) continue
    score += value * (BASE_WEIGHTS[key] / availableWeight)
  }

  return { score, factors: buildFactors(inputs, terms) }
}
