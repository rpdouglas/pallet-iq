import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { RestockLot } from '../../types/restockLot'

// restock_lots is global/cross-tenant (PALLETIQ-020 / ADR-0009) - the same
// public restock.ca data regardless of which tenant is looking, not
// tenants/{tenantId}/restock_lots. A single equality filter, no orderBy on
// a different field, so this needs no Firestore composite index -
// DiscoveredLotsPage.tsx sorts the (already-small, ~hundreds of docs)
// result client-side instead, the same choice WatchlistPage.tsx already
// made for its own closes-soonest sort.
export async function listActiveRestockLots(): Promise<RestockLot[]> {
  const snap = await getDocs(query(collection(db, 'restock_lots'), where('status', '==', 'active')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RestockLot, 'id'>) }))
}
