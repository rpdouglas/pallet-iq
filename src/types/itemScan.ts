export type ItemScanStatus = 'queued' | 'processing' | 'completed' | 'failed'

export const CONDITION_GRADES = ['new', 'like_new', 'good', 'fair', 'damaged_for_parts'] as const
export type ConditionGrade = (typeof CONDITION_GRADES)[number]

export const CONDITION_GRADE_LABELS: Record<ConditionGrade, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  damaged_for_parts: 'Damaged / for parts',
}

export interface ItemScanCandidate {
  itemName: string
  brand: string | null
  model: string | null
  category: string
  dimensions: string | null
  notableFeatures: string | null
  condition: ConditionGrade
  conditionJustification: string
  confidence: number
  // PALLETIQ-026 / ADR-0011.
  barcodeNumber: string | null
  groundedRetailPrice: number | null
  groundedRetailSource: string | null
}

// PALLETIQ-026 / ADR-0011.
export type PricingStatus = 'not_priced' | 'pricing' | 'priced' | 'unknown' | 'failed'
export type PricingFactorDirection = 'up' | 'down' | 'neutral'

export interface PricingFactor {
  label: string
  direction: PricingFactorDirection
  explanation: string | null
}

// PALLETIQ-026/035. A comp found during price research. `source` (added in
// PALLETIQ-035/ADR-0012) tags which part of the SOP-modeled research
// produced it - lets the UI group/label comps honestly (e.g. "eBay sold"
// vs "Kijiji - used") instead of the single flat eBay-only assumption the
// original eBay-Browse-API-only waterfall made.
export interface PricingComp {
  title: string
  price: number
  url: string | null
  source?: 'kijiji_new' | 'kijiji_used' | 'ebay_sold'
}

export interface PricingResult {
  msrp: number | null
  salePrice: number | null
  salePriceLow: number | null
  salePriceHigh: number | null
  liquidationPrice: number | null
  confidence: number
  sampleSize: number
  factors: PricingFactor[]
  comps: PricingComp[]
  waterfallStepsUsed: string[]
}

// PALLETIQ-027 / ADR-0011.
export type SaleabilityStatus = 'not_scored' | 'scoring' | 'scored' | 'failed'

export interface SaleabilityResult {
  /** 0-1. */
  score: number
  factors: PricingFactor[]
}

// PALLETIQ-030 / ADR-0014.
export type ListingCopyStatus = 'not_generated' | 'generating' | 'generated' | 'failed'

export interface ListingCopy {
  title: string
  description: string
}

// PALLETIQ-025 / ADR-0011. Mirrors functions/src/item-scans/types.ts's
// ItemScanDoc - kept as a plain client-side interface (id added on read),
// not re-exported from functions, since the two packages don't share a
// build step.
export interface ItemScan {
  id: string
  status: ItemScanStatus
  photoPaths: string[]
  candidates: ItemScanCandidate[]
  selectedCandidateIndex: number | null
  error: string | null
  pricingStatus: PricingStatus
  pricing: PricingResult | null
  pricingError: string | null
  saleabilityStatus: SaleabilityStatus
  saleabilityScore: SaleabilityResult | null
  saleabilityError: string | null
  listingCopyStatus: ListingCopyStatus
  listingCopy: ListingCopy | null
  listingCopyError: string | null
}
