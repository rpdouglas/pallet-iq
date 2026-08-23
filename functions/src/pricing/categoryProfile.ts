import type { ItemScanCandidate } from '../item-scans/types'

// docs/projects/treasure-hunter-plan.md section 4's category-conditional
// waterfall table collapses onto these five profiles. Shared by
// waterfall.ts (PALLETIQ-026's synchronous cache/UPC/grounding/eBay
// steps) and enrichment.ts (PALLETIQ-027's background category-specialist
// steps), since both need the same category -> profile mapping.
export type CategoryProfile = 'electronics' | 'games' | 'media' | 'tools' | 'fashion'

export function classifyCategoryProfile(category: string): CategoryProfile {
  const c = category.toLowerCase()
  if (/game|card|collectible|toy|funko|lego/.test(c)) return 'games'
  if (/book|vinyl|\bcd\b|music|media|isbn/.test(c)) return 'media'
  if (/fashion|sneaker|shoe|apparel|clothing|streetwear/.test(c)) return 'fashion'
  if (/tool|home good|hardware/.test(c)) return 'tools'
  return 'electronics'
}

// PALLETIQ-027. Within the "media" profile, books use Google Books (by
// ISBN) while vinyl/CDs use Discogs - the plan's table treats these as
// separate branches within the same broad category.
export function classifyMediaSubtype(category: string): 'book' | 'music' {
  return /book|isbn/.test(category.toLowerCase()) ? 'book' : 'music'
}

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
