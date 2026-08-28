import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

export type KwickstockLotStatus = 'active' | 'closed'

// kwickstock_lots/{lotId} - global, cross-tenant collection (NOT
// tenants/{tenantId}/...-scoped). Same shape as restock_lots (ADR-0009,
// PALLETIQ-020) applied to a second source - it's the same public
// kwickstock.ca data regardless of which tenant is looking, so one hourly
// scrape serves every tenant. Cloud-Functions-write-only, see
// firestore.rules. PALLETIQ-057.
//
// `lotId` is derived from the product detail page URL's own slug -
// kwickstock.ca has no separate "Lot #" identifier visible on a listing
// card the way restock.ca does (see parseLotListPage.ts's deriveLotId).
export interface KwickstockLotDoc {
  lotId: string
  title: string
  // Free text, not a fixed enum - same posture as restock_lots' `category`
  // (RestockLotDoc), and kwickstock.ca's own filter chips already show
  // overlapping/inconsistent category names (e.g. "Fashion & Accessories"
  // vs "Clothing & Accessories" both appeared on real cards), so this
  // scraper shouldn't try to normalize a taxonomy it doesn't control.
  category: string | null
  // Item count, from the card's "$X total • Y items" text. Nullable,
  // unlike restock_lots' `units` - unverified whether every kwickstock.ca
  // card actually shows this (see PALLETIQ-057's scope note).
  units: number | null
  // Free text, whitelisted against the site's own Condition filter values
  // (New / Like new / Used / Salvage) at parse time - see
  // parseLotListPage.ts's KNOWN_CONDITIONS. Nullable - a card badge for
  // condition wasn't confirmed present on every card in the screenshots
  // this was built from.
  condition: string | null
  pricePerUnit: number | null
  totalPrice: number | null
  // Confirmed as "KwickStock" on every real card seen so far, but kept as
  // parsed free text (not hardcoded) in case the storefront is or becomes
  // multi-seller.
  vendor: string | null
  location: string | null
  productUrl: string
  imageUrl: string | null
  status: KwickstockLotStatus
  firstSeenAt: Timestamp | FieldValue
  lastSeenAt: Timestamp | FieldValue
  updatedAt: FieldValue
}

// What parseLotListPage.ts can determine from a listing page alone - no
// Firestore-lifecycle fields (those are attached by scrapeKwickstockLots.ts's
// diff step, which knows whether a lot is new/existing/missing).
export type ParsedLot = Omit<
  KwickstockLotDoc,
  'status' | 'firstSeenAt' | 'lastSeenAt' | 'updatedAt'
>
