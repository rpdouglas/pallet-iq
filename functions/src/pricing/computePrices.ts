import type { ConditionGrade } from '../item-scans/types'

// PALLETIQ-026. Sale price as a fraction of the comp median, by condition -
// midpoints of docs/projects/treasure-hunter-plan.md section 5's ranges
// (Like New 90-100%, Good 70-85%, Fair/Damaged 40-60%). The plan's scale
// only names 4 buckets (New/Like New/Good/Fair-or-Damaged) where
// ItemScanCandidate's ConditionGrade has 5 - "new" and "damaged_for_parts"
// are documented extrapolations, not values stated in the plan.
export const CONDITION_SALE_MULTIPLIERS: Record<ConditionGrade, number> = {
  new: 1.0,
  like_new: 0.95,
  good: 0.775,
  fair: 0.5,
  damaged_for_parts: 0.3,
}

// Midpoint of the plan's "roughly 75-85% of median asking" asking-to-sold
// calibration default - a borrowed starting constant, not tuned against
// real outcomes yet (that's PALLETIQ-028, once outcome data exists).
export const ASKING_TO_SOLD_DISCOUNT_RATIO = 0.8

// Liquidation price uses a low percentile of the comp distribution rather
// than the median - "roughly 10th-25th percentile" per the plan; 20 is the
// chosen point within that range.
const LIQUIDATION_PERCENTILE = 20

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

export interface MsrpSignals {
  groundedRetailPrice: number | null
  upcMedianOfferPrice: number | null
}

export interface MsrpResult {
  msrp: number | null
  /** true when 2+ independent sources agreed within 20% of each other. */
  sourcesAgree: boolean | null
}

// "Take the consensus; flag as estimated when sources disagree or none
// exist" (plan section 5). With only 2 possible sources in this ticket
// (UPC lookup, grounding - Keepa is PALLETIQ-027), consensus is a simple
// average when both exist.
export function computeMsrp(signals: MsrpSignals): MsrpResult {
  const values = [signals.groundedRetailPrice, signals.upcMedianOfferPrice].filter(
    (v): v is number => v !== null,
  )
  if (values.length === 0) {
    return { msrp: null, sourcesAgree: null }
  }
  if (values.length === 1) {
    return { msrp: values[0] ?? null, sourcesAgree: null }
  }
  const [a, b] = values as [number, number]
  const larger = Math.max(a, b)
  const smaller = Math.min(a, b)
  const sourcesAgree = larger === 0 ? true : (larger - smaller) / larger <= 0.2
  return { msrp: (a + b) / 2, sourcesAgree }
}

export interface SalePriceResult {
  point: number
  low: number
  high: number
}

export function computeSalePrice(
  compPrices: number[],
  condition: ConditionGrade,
): SalePriceResult | null {
  const medianPrice = median(compPrices)
  if (medianPrice === null) return null
  const multiplier = CONDITION_SALE_MULTIPLIERS[condition] * ASKING_TO_SOLD_DISCOUNT_RATIO
  const low = percentile(compPrices, 10)
  const high = percentile(compPrices, 90)
  return {
    point: medianPrice * multiplier,
    low: (low ?? medianPrice) * multiplier,
    high: (high ?? medianPrice) * multiplier,
  }
}

export function computeLiquidationPrice(
  compPrices: number[],
  condition: ConditionGrade,
): number | null {
  const p = percentile(compPrices, LIQUIDATION_PERCENTILE)
  if (p === null) return null
  return p * CONDITION_SALE_MULTIPLIERS[condition] * ASKING_TO_SOLD_DISCOUNT_RATIO
}
