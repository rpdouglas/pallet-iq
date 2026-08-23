import type { ItemScanCandidate } from '../item-scans/types'

// PALLETIQ-026/035. Relocated from the deleted categoryProfile.ts
// (PALLETIQ-035/ADR-0012 removed the category-conditional waterfall this
// file used to also hold classifyCategoryProfile/classifyMediaSubtype for
// - the SOP-modeled research doesn't category-branch, so those had no
// remaining caller). computeCacheKey itself never depended on any vendor
// API and is unchanged.
export function computeCacheKey(candidate: ItemScanCandidate): string {
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
