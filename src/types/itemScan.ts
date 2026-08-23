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
}
