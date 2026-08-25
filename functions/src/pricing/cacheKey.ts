import type { ItemScanCandidate } from '../item-scans/types'

// PALLETIQ-053. A real UPC/EAN is all-digits, 6-14 characters long. Never
// trust barcodeNumber as path-safe as-is - manifest data commonly uses
// placeholder text for "no barcode" (e.g. "N/A", which contains a
// literal "/" and corrupts a Firestore document path built from it,
// found live-verifying PALLETIQ-042 against a real production import: 10
// of 21 SKUs in one lot silently failed this way). A vision-read barcode
// (the other candidate.barcodeNumber source, identifyItem.ts) is
// unlikely to produce non-digit noise but isn't guaranteed to either -
// this guards both callers of computeCacheKey, not just manifest-sourced
// ones.
function sanitizeBarcodeNumber(value: string | null): string | null {
  if (!value) return null
  const digitsOnly = value.replace(/\D/g, '')
  return digitsOnly.length >= 6 ? digitsOnly : null
}

// PALLETIQ-026/035. Relocated from the deleted categoryProfile.ts
// (PALLETIQ-035/ADR-0012 removed the category-conditional waterfall this
// file used to also hold classifyCategoryProfile/classifyMediaSubtype for
// - the SOP-modeled research doesn't category-branch, so those had no
// remaining caller). computeCacheKey itself never depended on any vendor
// API and is unchanged.
export function computeCacheKey(candidate: ItemScanCandidate): string {
  const barcodeNumber = sanitizeBarcodeNumber(candidate.barcodeNumber)
  if (barcodeNumber) {
    return `upc:${barcodeNumber}`
  }
  const fingerprint = [candidate.brand, candidate.model, candidate.itemName]
    .filter((v): v is string => !!v)
    .join('|')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return `fp:${fingerprint}`
}
