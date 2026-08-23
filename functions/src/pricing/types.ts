import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

export type PricingStatus = 'not_priced' | 'pricing' | 'priced' | 'unknown' | 'failed'

export type PricingFactorDirection = 'up' | 'down' | 'neutral'

// docs/design/explainable-scoring.md's factor-breakdown row shape.
export interface PricingFactor {
  label: string
  direction: PricingFactorDirection
  explanation: string | null
}

// PALLETIQ-026. An active-listing comp from the eBay Browse API, scaled by
// the calibration ratio - deliberately never labeled "sold" anywhere in
// the UI (see waterfall.ts's comment on why), since eBay Browse API only
// ever returns active asking prices, not real sold data.
export interface PricingComp {
  title: string
  price: number
  url: string | null
}

// PALLETIQ-026 / ADR-0011. The pricing waterfall's output, stored on
// ItemScanDoc.pricing once a scan's selected candidate has been priced.
export interface PricingResult {
  msrp: number | null
  salePrice: number | null
  salePriceLow: number | null
  salePriceHigh: number | null
  liquidationPrice: number | null
  /** 0-1. The waterfall's own confidence, separate from Gemini's per-candidate identification confidence. */
  confidence: number
  /** How many comps/signals contributed to salePrice/liquidationPrice. */
  sampleSize: number
  factors: PricingFactor[]
  comps: PricingComp[]
  /** Which waterfall steps actually produced a signal, in the order they ran - e.g. ['cache'] or ['upc', 'grounding', 'ebay']. */
  waterfallStepsUsed: string[]
}

// product_price_cache/{cacheKey} (global, cross-tenant). PALLETIQ-026 /
// ADR-0011. Keyed by UPC when the candidate had a legible barcode,
// otherwise a normalized brand|model|itemName fingerprint - see
// waterfall.ts's computeCacheKey. read: isSignedIn(), write: if false
// (Cloud Functions only).
export interface ProductPriceCacheDoc {
  pricing: PricingResult
  updatedAt: Timestamp | FieldValue
}
