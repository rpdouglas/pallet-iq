import type { Timestamp } from 'firebase/firestore'

// PALLETIQ-020 / ADR-0009 (server shape: functions/src/restock-scraper/types.ts's
// RestockLotDoc) / PALLETIQ-039 (this client read). Deliberately narrower
// than RestockLotDoc - `status`/`lastSeenAt`/`updatedAt` are scraper
// bookkeeping this page never needs to render (the "active only" filter is
// applied server-side in the query itself, see restockLotsActions.ts).
export interface RestockLot {
  id: string
  title: string
  category: string
  units: number
  condition: string
  msrp: number | null
  price: number | null
  costPerUnit: number | null
  vendor: string | null
  warehouse: string | null
  productUrl: string
  imageUrl: string | null
  hasManifest: boolean
  firstSeenAt: Timestamp
}
