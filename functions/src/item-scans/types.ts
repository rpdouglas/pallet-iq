import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

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
  createdAt: Timestamp | FieldValue
  updatedAt: Timestamp | FieldValue
}
