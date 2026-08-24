import type { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { PricingResult, PricingStatus } from '../pricing/types'
import type { SaleabilityResult } from '../saleability/computeSaleability'

export type SaleabilityStatus = 'not_scored' | 'scoring' | 'scored' | 'failed'

// PALLETIQ-030 / ADR-0014.
export type ListingCopyStatus = 'not_generated' | 'generating' | 'generated' | 'failed'

export interface ListingCopy {
  title: string
  description: string
}

export type ItemScanStatus = 'queued' | 'processing' | 'completed' | 'failed'

export const CONDITION_GRADES = ['new', 'like_new', 'good', 'fair', 'damaged_for_parts'] as const
export type ConditionGrade = (typeof CONDITION_GRADES)[number]

export interface ItemScanCandidate {
  itemName: string
  brand: string | null
  model: string | null
  category: string
  dimensions: string | null
  notableFeatures: string | null
  condition: ConditionGrade
  conditionJustification: string
  /** 0-1. Gemini's own confidence in this specific candidate. */
  confidence: number
  // PALLETIQ-026 / ADR-0011. Digits read from a barcode photo, if one was
  // captured and is legible - feeds the pricing waterfall's UPC-lookup
  // step. Not a true deterministic decode (that would need a barcode-
  // scanning library against the raw pixels); reusing the existing vision
  // call to read the human-readable digits printed under the barcode is
  // the pragmatic v1 choice - see functions/src/pricing/waterfall.ts.
  barcodeNumber: string | null
  // PALLETIQ-026 / ADR-0011. A current retail/MSRP price the Google
  // Search grounding tool surfaced while identifying this candidate, if
  // any - "already available from PALLETIQ-025's identification call,
  // reused here" per the ADR, rather than a second Gemini call.
  groundedRetailPrice: number | null
  groundedRetailSource: string | null
}

// tenants/{tenantId}/item_scans/{scanId}. PALLETIQ-025 / ADR-0011. Stores
// the full Gemini identification record - brand/model/category/condition/
// dimensions/notable features, not just pricing-relevant fields - per
// docs/projects/treasure-hunter-plan.md section 2's "store the full
// record, it's the reusable asset" argument. Pricing/saleability/outcome
// fields are added by later tickets (PALLETIQ-026-028), not this one.
export interface ItemScanDoc {
  status: ItemScanStatus
  photoPaths: string[]
  // Ranked by confidence, descending. 1-3 entries once status is
  // 'completed'; empty while 'queued'/'processing' or on 'failed'.
  candidates: ItemScanCandidate[]
  // Auto-set to 0 when candidates[0]'s confidence clears CONFIDENCE_THRESHOLD
  // (see identifyItem.ts); left null for the low-confidence top-3 workflow,
  // where the Buyer picks (or corrects) via a direct client write - see
  // ADR-0011, this ticket's scope note.
  selectedCandidateIndex: number | null
  error: string | null
  // PALLETIQ-026 / ADR-0011. Pricing runs as a separate step, after a
  // candidate is confirmed - its own status lifecycle rather than folding
  // into `status` above, since identification and pricing can each
  // independently succeed/fail. 'unknown' is a legitimate terminal state
  // (no waterfall step found enough signal to price this item), not an
  // error - see waterfall.ts.
  pricingStatus: PricingStatus
  pricing: PricingResult | null
  pricingError: string | null
  // PALLETIQ-027 / ADR-0011. Computed once background enrichment settles
  // (see enrichItemScanPricing.ts) - a separate status lifecycle from
  // pricingStatus above, since the "instant" pricing result and the
  // saleability score (which can depend on slower category-specialist
  // data) resolve at different times per the plan's own "instant estimate
  // now, refine over the next minute" design.
  saleabilityStatus: SaleabilityStatus
  saleabilityScore: SaleabilityResult | null
  saleabilityError: string | null
  // PALLETIQ-030 / ADR-0014. A separate status lifecycle from pricing/
  // saleability above, same reasoning - listing-copy generation is its
  // own independently-triggerable, independently-failable step, not
  // folded into either of the others. Owner/Manager-triggered, not
  // automatic - unlike pricing, there's no reason to generate copy for
  // every scan the instant it's priced.
  listingCopyStatus: ListingCopyStatus
  listingCopy: ListingCopy | null
  listingCopyError: string | null
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
}
