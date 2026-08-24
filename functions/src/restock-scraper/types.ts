import type { FieldValue, Timestamp } from 'firebase-admin/firestore'

export type RestockLotStatus = 'active' | 'closed'

// restock_lots/{lotNumber} - global, cross-tenant collection (NOT
// tenants/{tenantId}/...-scoped). It's the same public restock.ca data
// regardless of which tenant is looking, so one hourly scrape serves every
// tenant rather than duplicating writes per tenant - same shape as
// product_intelligence. Cloud-Functions-write-only, see firestore.rules.
// PALLETIQ-020 / ADR-0009.
//
// `lotNumber` (restock's own "Lot # NNNNNN" identifier, also the last path
// segment of productUrl) is the Firestore doc ID - stable across a
// listing's lifecycle and human-readable, unlike BigCommerce's internal
// numeric product ID which this scraper never persists.
export interface RestockLotDoc {
  lotNumber: string
  title: string
  category: string
  units: number
  // Free text, not a fixed enum - restock.ca's own condition values
  // (Brand New / Like New / Returns / Salvage, as of this writing) are
  // outside this codebase's control and could change without notice; the
  // scraper should never crash on an unrecognized value.
  condition: string
  msrp: number | null
  price: number | null
  costPerUnit: number | null
  vendor: string | null
  warehouse: string | null
  productUrl: string
  imageUrl: string | null
  // Populated by a best-effort fetch of the lot detail page for newly-seen
  // lots only (see extractManifestTable.ts) - false if no manifest table
  // was found, not re-fetched on later runs once a lot is already known.
  // The extracted rows themselves live in the manifestItems subcollection
  // (PALLETIQ-052 / ADR-0018), not on this doc - DiscoveredLotsPage.tsx
  // fetches the whole active set client-side with no pagination, so
  // embedding item rows here would bloat every list-fetched doc.
  hasManifest: boolean
  status: RestockLotStatus
  firstSeenAt: Timestamp | FieldValue
  lastSeenAt: Timestamp | FieldValue
  updatedAt: FieldValue
}

// What parseLotListPage.ts can determine from a category listing page
// alone - no manifest data (that needs a separate detail-page fetch) and no
// Firestore-lifecycle fields (those are attached by scrapeRestockLots.ts's
// diff step, which knows whether a lot is new/existing/missing).
export type ParsedLot = Omit<
  RestockLotDoc,
  'hasManifest' | 'status' | 'firstSeenAt' | 'lastSeenAt' | 'updatedAt'
>
